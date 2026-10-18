"""Bounded read-only collectors and actual Arabic semantic analysis for Radar."""
from __future__ import annotations
import importlib.metadata as metadata
import json, os, re, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, parse_qs

MODEL = json.loads(Path(__file__).with_name('model.json').read_text())
os.environ.setdefault('HF_HUB_DISABLE_TELEMETRY', '1')
os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')
os.environ.setdefault('HF_HOME', str(Path(__file__).parent / '.cache' / 'huggingface'))
_model = None

class ToolError(RuntimeError):
    def __init__(self, code): self.code=code; super().__init__(code)

def versions():
    return {name:{'installed':True,'tested':False,'version':metadata.version(package)} for name,package in {
        'yt-dlp':'yt-dlp','Instaloader':'instaloader','instagrapi':'instagrapi','Agent-Reach':'agent-reach',
        'Sentence Transformers':'sentence-transformers','BERTopic':'bertopic','CAMeL Tools':'camel-tools'}.items()}

def route(url):
    from agent_reach.channels import get_channel
    from agent_reach.channels.base import Channel
    parsed=urlparse(url)
    if parsed.scheme!='https' or parsed.username or parsed.password: raise ToolError('SOURCE_URL_INVALID')
    if parsed.hostname in ('www.youtube.com','youtube.com','m.youtube.com','youtu.be'):
        channel=get_channel('youtube')
        return {'platform':'youtube','upstream':channel.ordered_backends(),'collectors':['yt-dlp'],'routeVerified':channel.can_handle(url)}
    if parsed.hostname in ('www.instagram.com','instagram.com'):
        class InstagramComments(Channel):
            name='radar_instagram_comments'
            backends=['instaloader','instagrapi']
            def can_handle(self, value): return get_channel('instagram').can_handle(value)
        extension=InstagramComments()
        return {'platform':'instagram','upstream':get_channel('instagram').ordered_backends(),'collectors':extension.ordered_backends(),'routeVerified':extension.can_handle(url),'extension':'Radar read-only comment collectors'}
    raise ToolError('SOURCE_URL_INVALID')

def arabic_tokens(text):
    from camel_tools.tokenizers.word import simple_word_tokenize
    from camel_tools.utils.dediac import dediac_ar
    from camel_tools.utils.normalize import normalize_alef_ar, normalize_alef_maksura_ar
    normalized=normalize_alef_maksura_ar(normalize_alef_ar(dediac_ar(text)))
    return [part.lower() for part in simple_word_tokenize(normalized) if len(part)>1 and any(c.isalnum() for c in part)]

def model():
    global _model
    if _model is None:
        import torch
        torch.set_num_threads(2)
        from sentence_transformers import SentenceTransformer
        _model=SentenceTransformer(MODEL['id'],revision=MODEL['revision'],device='cpu',trust_remote_code=False)
        _model.max_seq_length=MODEL['maxTokens']
    return _model

def analyze(records):
    import numpy as np
    from bertopic import BERTopic
    from bertopic.dimensionality import BaseDimensionalityReduction
    from hdbscan import HDBSCAN
    from sklearn.feature_extraction.text import CountVectorizer
    if not 2<=len(records)<=80: raise ToolError('RECORD_LIMIT')
    texts=[str(row['text'])[:1000] for row in records]
    tokens=[arabic_tokens(text) for text in texts]
    if not all(tokens): raise ToolError('TEXT_WITHOUT_WORDS')
    embeddings=model().encode(texts,batch_size=8,show_progress_bar=False,convert_to_numpy=True,normalize_embeddings=True)
    similarity=embeddings@embeddings.T
    pairs=[]
    for i in range(len(records)):
        for j in range(i+1,len(records)):
            pairs.append({'left':records[i]['id'],'right':records[j]['id'],'cosine':round(float(similarity[i,j]),4)})
    pairs.sort(key=lambda item:item['cosine'],reverse=True)
    vectorizer=CountVectorizer(tokenizer=arabic_tokens,token_pattern=None,lowercase=False,ngram_range=(1,2),max_features=1000)
    topic_model=BERTopic(language='multilingual',embedding_model=None,umap_model=BaseDimensionalityReduction(),hdbscan_model=HDBSCAN(min_cluster_size=2,min_samples=1,metric='euclidean',core_dist_n_jobs=1),vectorizer_model=vectorizer,calculate_probabilities=False,verbose=False)
    labels,_=topic_model.fit_transform(texts,embeddings)
    groups=[]
    for label in sorted(set(labels)):
        indices=[i for i,current in enumerate(labels) if current==label]
        groups.append({'topicId':int(label),'unassigned':label==-1,'count':len(indices),'recordIds':[records[i]['id'] for i in indices],
                       'terms':[term for term,_ in (topic_model.get_topic(label) or [])[:5]]})
    return {'ok':True,'action':'analyze','count':len(records),'model':MODEL,'groups':groups,'pairs':pairs[:12],
            'tokens':[{'id':row['id'],'tokens':words[:16]} for row,words in zip(records,tokens)],
            'tools':['Sentence Transformers','BERTopic','CAMeL Tools'],'source':'original record IDs; semantic groups need review'}

class Budget:
    def __init__(self, limit=12, seconds=100): self.calls=0; self.limit=limit; self.deadline=time.monotonic()+seconds; self.blocked=None
    def before(self):
        if self.blocked: raise ToolError(self.blocked)
        if time.monotonic()>self.deadline: self.blocked='TIME_LIMIT'; raise ToolError(self.blocked)
        if self.calls>=self.limit: self.blocked='REQUEST_LIMIT'; raise ToolError(self.blocked)
        self.calls+=1
    def after(self,status):
        if status in (401,403,429): self.blocked='HTTP_'+str(status); raise ToolError(self.blocked)

class InstagramTransport:
    """Guard Session.send globally inside this short-lived collector process."""
    def __init__(self,budget):self.budget=budget
    def __enter__(self):
        import requests
        self.original=requests.Session.send
        outer=self
        def send(session,request,**kwargs):
            host=urlparse(request.url).hostname or ''
            if not (host=='instagram.com' or host.endswith('.instagram.com')):raise ToolError('NETWORK_SCOPE')
            if any(part in urlparse(request.url).path for part in ('/like/','/comment/','/direct_v2/','/follow/','/accounts/login')):raise ToolError('WRITE_NOT_ALLOWED')
            outer.budget.before();kwargs['timeout']=(5,15);kwargs['allow_redirects']=False
            response=outer.original(session,request,**kwargs)
            outer.budget.after(response.status_code)
            if 300<=response.status_code<400:outer.budget.blocked='REDIRECT_STOPPED';raise ToolError('REDIRECT_STOPPED')
            # A policy stop cannot be consumed as a retry by an upstream library.
            if any(marker in response.text[:2000] for marker in ('challenge_required','checkpoint_required','feedback_required')):
                outer.budget.blocked='ACCESS_CHALLENGE';raise ToolError('ACCESS_CHALLENGE')
            return response
        requests.Session.send=send
        return self
    def __exit__(self,*args):
        import requests
        requests.Session.send=self.original

def stamp(value):
    if not value:return None
    if isinstance(value,(float,int)):return datetime.fromtimestamp(value,timezone.utc).isoformat()
    if getattr(value,'tzinfo',None) is None and hasattr(value,'replace'):value=value.replace(tzinfo=timezone.utc)
    return value.isoformat() if hasattr(value,'isoformat') else str(value)

def collect(payload):
    source=payload['url']; selected=payload['collector']; routing=route(source)
    if selected not in routing['collectors']:raise ToolError('COLLECTOR_PLATFORM_MISMATCH')
    cap=max(1,min(80,int(payload.get('maxRecords',50)))); cookies=payload.get('cookies') or {}
    rows=[];budget=Budget();remaining=None;failure=None;started=datetime.now(timezone.utc).isoformat()
    if selected=='instaloader' and (not payload.get('username') or not cookies.get('sessionid') or not cookies.get('csrftoken')):raise ToolError('SESSION_REQUIRED')
    def emit(raw,parent=None):
        if len(rows)>=cap:return
        rows.append({'id':str(raw.id),'text':raw.text,'author':raw.owner.username,'createdAt':stamp(raw.created_at_utc),
                     'likes':getattr(raw,'likes_count',None),'sourceUrl':source,'platform':'instagram','parentId':parent,'kind':'reply' if parent else 'comment','collectedAt':started,'collectionMethod':selected})
    try:
        if selected=='yt-dlp':
            import yt_dlp
            parsed=urlparse(source);video=parsed.path.strip('/') if parsed.hostname=='youtu.be' else (parse_qs(parsed.query).get('v') or [parsed.path.split('/')[-1]])[0]
            if not re.fullmatch(r'[A-Za-z0-9_-]{11}',video):raise ToolError('VIDEO_URL_REQUIRED')
            class Quiet:
                def debug(self,*args):pass
                def warning(self,*args):pass
                def error(self,*args):pass
            opts={'skip_download':True,'getcomments':True,'noplaylist':True,'quiet':True,'no_warnings':True,'logger':Quiet(),
                  'socket_timeout':15,'retries':0,'extractor_retries':0,'fragment_retries':0,
                  'extractor_args':{'youtube':{'comment_sort':['new'],'max_comments':[str(cap),str(cap),str(cap if payload.get('includeReplies') else 0),'5','2' if payload.get('includeReplies') else '1']}}}
            with yt_dlp.YoutubeDL(opts) as ydl:
                original=ydl.urlopen
                def guarded(request,*args,**kwargs):
                    budget.before()
                    try:result=original(request,*args,**kwargs)
                    except Exception as cause:
                        status=getattr(cause,'status',None) or getattr(cause,'code',None)
                        if status:budget.after(status)
                        raise
                    budget.after(getattr(result,'status',200));return result
                ydl.urlopen=guarded
                info=ydl.extract_info(source,download=False)
            for raw in (info.get('comments') or [])[:cap]:
                rows.append({'id':raw.get('id'),'text':raw.get('text',''),'author':raw.get('author',''),'createdAt':stamp(raw.get('timestamp')),
                             'sourceUrl':info.get('webpage_url') or source,'platform':'youtube','parentId':None if raw.get('parent')=='root' else raw.get('parent'),
                             'kind':'reply' if raw.get('parent') not in (None,'root') else 'comment','likes':raw.get('like_count'), 'collectedAt':started,'collectionMethod':selected})
            remaining='not_exhaustive'
        else:
            match=re.search(r'/(?:p|reel)/([A-Za-z0-9_-]+)',urlparse(source).path)
            if not match:raise ToolError('POST_URL_REQUIRED')
            code=match.group(1)
            with InstagramTransport(budget):
                if selected=='instaloader':
                    import instaloader
                    loader=instaloader.Instaloader(quiet=True,sleep=False,max_connection_attempts=1,request_timeout=15,fatal_status_codes=[401,403,429],download_pictures=False,download_videos=False,download_video_thumbnails=False,download_comments=False,save_metadata=False)
                    loader.load_session(payload['username'],cookies)
                    post=instaloader.Post.from_shortcode(loader.context,code)
                    for parent in post.get_comments():
                        emit(parent)
                        if payload.get('includeReplies'):
                            for index,reply in enumerate(parent.answers):
                                if index>=5 or len(rows)>=cap:break
                                emit(reply,str(parent.id))
                        if len(rows)>=cap:remaining='record_limit';break
                else:
                    from instagrapi import Client
                    client=Client(public_transport='requests',private_transport='requests',public_request_retries_count=1,public_request_retries_timeout=0,session_retry_total=0,session_retry_backoff_factor=0,session_retry_statuses=[],with_challenge_flow=False)
                    client.public.cookies.update(cookies);client.private.cookies.update(cookies)
                    cursor=''
                    while len(rows)<cap:
                        page,cursor=client.media_comments_public_gql_chunk(code,end_cursor=cursor)
                        for raw in page[:cap-len(rows)]:
                            rows.append({'id':str(raw.pk),'text':raw.text,'author':raw.user.username,'createdAt':stamp(raw.created_at_utc),'likes':raw.like_count,
                                         'sourceUrl':source,'platform':'instagram','collectedAt':started,'collectionMethod':selected,'kind':'comment'})
                        remaining=cursor or None
                        if not cursor:break
                    if payload.get('includeReplies'):remaining={'cursor':remaining,'replies':'not_collected_by_public_chunk'}
    except Exception as cause:
        failure=budget.blocked or getattr(cause,'code',None) or ('ACCESS_OR_SCHEMA_ERROR' if selected!='yt-dlp' else 'SOURCE_UNAVAILABLE')
    omitted=0
    while rows and len(json.dumps(rows,ensure_ascii=False).encode())>150000:rows.pop();omitted+=1
    if omitted:remaining={'reason':'result_size_limit','omitted':omitted,'previous':remaining}
    return {'ok':bool(rows),'action':'collect','records':rows,'report':{'collector':selected,'routing':routing,'state':'partial' if rows and (failure or omitted) else 'blocked' if failure else 'completed' if rows else 'uncollected',
            'errorCode':failure,'requests':budget.calls,'requestLimit':budget.limit,'budgetScope':'yt-dlp transport dispatch' if selected=='yt-dlp' else 'requests.Session.send',
            'remaining':remaining,'records':len(rows),'collectedAt':started,'coverage':'bounded selected source; no global comment index','liveReadVerified':bool(rows) and budget.calls>0}}

def execute(payload):
    if payload.get('action')=='analyze':return analyze(payload['records'])
    if payload.get('action')=='collect':return collect(payload)
    raise ToolError('ACTION_INVALID')

def smoke(heavy=True):
    import instaloader
    from instagrapi import Client
    from yt_dlp import YoutubeDL
    assert route('https://www.youtube.com/watch?v=abcdefghijk')['collectors']==['yt-dlp']
    assert route('https://www.instagram.com/p/TESTONLY/')['collectors']==['instaloader','instagrapi']
    assert arabic_tokens('أَبِي اِسْتِشَارَة')==['ابي','استشارة']
    assert Client(public_transport='requests',private_transport='requests',public_request_retries_count=1,session_retry_total=0,with_challenge_flow=False)
    report=versions()
    for name in ['yt-dlp','Instaloader','instagrapi','Agent-Reach','CAMeL Tools']:report[name]['tested']=True
    analysis=None
    if heavy:
        examples=['كم تكلفة استشارة قانونية؟','أبي محامي لعقد إيجار','شلون أراجع عقد الشقة؟','عندي سؤال عن عقد الإيجار','أحتاج دورة لغة إنجليزية','وين أتعلم محادثة إنجليزية؟','أبي مدرس للإنجليزي','تنصحون بدورة لغة للمبتدئين؟','أحتاج مورد لحوم للمطعم','أبحث عن توريد خبز البرغر','وين ألقى مورد مطاعم؟','أسعار توريد الدجاج للمطاعم']
        analysis=analyze([{'id':'synthetic-'+str(i),'text':text} for i,text in enumerate(examples)])
        assert analysis['count']==12
        for name in ['Sentence Transformers','BERTopic']:report[name]['tested']=True
    return {'tools':report,'model':MODEL,'syntheticTest':True,'analysisCount':analysis['count'] if analysis else None,'livePlatformAccessVerified':False}

if __name__=='__main__':
    import argparse,sys
    parser=argparse.ArgumentParser();parser.add_argument('operation',choices=['smoke','execute']);parser.add_argument('--light',action='store_true');args=parser.parse_args()
    if args.operation=='smoke':print(json.dumps(smoke(not args.light),ensure_ascii=False))
    else:
        try:result=execute(json.load(sys.stdin))
        except Exception as cause:result={'ok':False,'errorCode':getattr(cause,'code','TOOL_FAILED')}
        print(json.dumps(result,ensure_ascii=False))
