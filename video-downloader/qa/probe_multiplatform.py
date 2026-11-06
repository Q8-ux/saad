"""Evaluate a community Cobalt instance: HTTP, browser CORS and supported extraction.
Do not log full media URLs; endpoint may be blocked, rate-limited or private.
"""
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import json
API="https://api-cobalt.eversiege.network/"
TESTS={
  "tiktok":"https://vt.tiktok.com/ZSp6Vv81S/",
  "youtube":"https://www.youtube.com/watch?v=jNQXAC9IVRw",
}
def call(label, request):
    try:
        with urlopen(request, timeout=24) as response:
            data=response.read(100000)
            headers=response.headers
            print(label, "status",response.status,"cors",headers.get("Access-Control-Allow-Origin"),"type",headers.get("Content-Type"))
            try:
                body=json.loads(data)
                print(label,"result",body.get("status"),"error",str((body.get("error") or {}).get("code",""))[:150],
                      "file_link",bool(body.get("url")),"picker_size",len(body.get("picker") or []))
            except Exception:print(label,"body not JSON",len(data))
    except HTTPError as e:
        print(label,"http_error",e.code,"cors",e.headers.get("Access-Control-Allow-Origin"),"body",e.read(150).decode(errors="replace"))
    except Exception as e:
        print(label,"error",type(e).__name__,str(e)[:140])
call("health", Request(API,headers={"Origin":"https://q8-ux.github.io","Accept":"application/json"}))
call("preflight",Request(API,method="OPTIONS",headers={
 "Origin":"https://q8-ux.github.io","Access-Control-Request-Method":"POST",
 "Access-Control-Request-Headers":"content-type",
}))
for platform,url in TESTS.items():
    req=Request(API,data=json.dumps({"url":url,"videoQuality":"720"}).encode(),method="POST",headers={
      "Origin":"https://q8-ux.github.io","Content-Type":"application/json","Accept":"application/json"})
    call(platform,req)
