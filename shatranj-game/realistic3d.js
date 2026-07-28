(function(){
  'use strict';
  const boardEl=document.getElementById('board');
  if(!boardEl)return;

  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}

  async function boot(){
    try{
      if(!window.THREE)await loadScript('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js');
      init3D();
    }catch(e){console.warn('3D renderer unavailable',e)}
  }

  function init3D(){
    const T=window.THREE;
    const shell=boardEl.parentElement;
    shell.classList.add('board-3d-shell');
    let mount=document.getElementById('board3d');
    if(!mount){mount=document.createElement('div');mount.id='board3d';mount.setAttribute('aria-hidden','true');shell.insertBefore(mount,boardEl)}

    const scene=new T.Scene();
    scene.background=new T.Color(0x01040a);
    scene.fog=new T.FogExp2(0x02060c,0.034);

    const camera=new T.PerspectiveCamera(31,1,.1,100);
    camera.position.set(0,10.9,10.9);
    camera.lookAt(0,.3,0);

    const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.23;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.physicallyCorrectLights=true;
    mount.replaceChildren(renderer.domElement);

    const hemi=new T.HemisphereLight(0xb9e8ff,0x08030b,1.45);scene.add(hemi);
    const key=new T.DirectionalLight(0xffffff,4.8);key.position.set(4.5,11,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.00035;key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;scene.add(key);
    const rimBlue=new T.SpotLight(0x18c9ff,145,25,.55,.65,1.7);rimBlue.position.set(-7,7,6);rimBlue.target.position.set(0,0,0);scene.add(rimBlue,rimBlue.target);
    const rimRed=new T.SpotLight(0xff304d,135,25,.55,.65,1.7);rimRed.position.set(7,6,-6);rimRed.target.position.set(0,0,0);scene.add(rimRed,rimRed.target);
    const fill=new T.PointLight(0xffffff,24,18,2);fill.position.set(0,5,1);scene.add(fill);

    const ground=new T.Mesh(new T.CircleGeometry(13,96),new T.MeshPhysicalMaterial({color:0x02050a,metalness:.8,roughness:.18,clearcoat:1,clearcoatRoughness:.08}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.58;ground.receiveShadow=true;scene.add(ground);

    const baseMat=new T.MeshPhysicalMaterial({color:0x060b12,metalness:.96,roughness:.16,clearcoat:1,clearcoatRoughness:.05});
    const base=new T.Mesh(new T.BoxGeometry(10.35,.55,10.35,2,1,2),baseMat);base.position.y=-.34;base.castShadow=true;base.receiveShadow=true;scene.add(base);
    const bevel=new T.Mesh(new T.BoxGeometry(9.7,.24,9.7),new T.MeshPhysicalMaterial({color:0x18202a,metalness:1,roughness:.1,clearcoat:1}));bevel.position.y=-.05;bevel.receiveShadow=true;scene.add(bevel);

    const tileGeo=new T.BoxGeometry(1,.16,1,2,1,2);
    const lightMat=new T.MeshPhysicalMaterial({color:0x6d8294,metalness:.34,roughness:.22,clearcoat:1,clearcoatRoughness:.12});
    const darkMat=new T.MeshPhysicalMaterial({color:0x101923,metalness:.72,roughness:.2,clearcoat:1,clearcoatRoughness:.08});
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const tile=new T.Mesh(tileGeo,(r+c)%2?darkMat:lightMat);
      tile.position.set(c-3.5,.13,r-3.5);tile.receiveShadow=true;tile.castShadow=true;scene.add(tile);
    }

    function strip(color,z){const m=new T.Mesh(new T.BoxGeometry(8.85,.055,.055),new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:10,metalness:.5,roughness:.18}));m.position.set(0,.12,z);scene.add(m);return m}
    const blueStrip=strip(0x16c7ff,4.47),redStrip=strip(0xff304d,-4.47);

    const piecesGroup=new T.Group();scene.add(piecesGroup);
    const matBlue=new T.MeshPhysicalMaterial({color:0x149fe0,metalness:.82,roughness:.12,clearcoat:1,clearcoatRoughness:.035,ior:1.52,reflectivity:1,emissive:0x003b73,emissiveIntensity:.28});
    const matRed=new T.MeshPhysicalMaterial({color:0xcf233a,metalness:.82,roughness:.12,clearcoat:1,clearcoatRoughness:.035,ior:1.52,reflectivity:1,emissive:0x5f0010,emissiveIntensity:.3});
    const trimBlue=new T.MeshPhysicalMaterial({color:0xa9ecff,metalness:1,roughness:.08,clearcoat:1,emissive:0x16c7ff,emissiveIntensity:1.4});
    const trimRed=new T.MeshPhysicalMaterial({color:0xffb0bd,metalness:1,roughness:.08,clearcoat:1,emissive:0xff304d,emissiveIntensity:1.35});

    const profiles={
      p:[[0,0],[.43,.02],[.49,.10],[.48,.16],[.37,.24],[.31,.36],[.27,.68],[.25,.93],[.34,1.03],[.36,1.12],[.28,1.21],[.23,1.31],[0,1.38]],
      r:[[0,0],[.48,.02],[.54,.11],[.52,.18],[.40,.27],[.35,.43],[.32,1.02],[.42,1.11],[.46,1.26],[.44,1.43],[0,1.48]],
      b:[[0,0],[.47,.02],[.53,.12],[.50,.19],[.39,.28],[.31,.48],[.26,.90],[.23,1.18],[.34,1.32],[.31,1.48],[.21,1.66],[0,1.72]],
      q:[[0,0],[.50,.02],[.56,.12],[.53,.20],[.40,.30],[.31,.55],[.27,1.02],[.24,1.29],[.39,1.43],[.31,1.60],[.18,1.78],[0,1.86]],
      k:[[0,0],[.51,.02],[.57,.12],[.54,.20],[.41,.31],[.32,.58],[.28,1.09],[.24,1.37],[.37,1.51],[.30,1.68],[.19,1.84],[0,1.90]]
    };

    function lathe(profile,mat){const pts=profile.map(([x,y])=>new T.Vector2(x,y));const mesh=new T.Mesh(new T.LatheGeometry(pts,72),mat);mesh.castShadow=true;mesh.receiveShadow=true;return mesh}
    function addRing(g,y,r,mat){const ring=new T.Mesh(new T.TorusGeometry(r,.035,16,64),mat);ring.rotation.x=Math.PI/2;ring.position.y=y;ring.castShadow=true;g.add(ring)}
    function addBaseDetails(g,trim){addRing(g,.12,.39,trim);addRing(g,.24,.34,trim)}
    function createKnight(mat,trim){
      const g=new T.Group();g.add(lathe([[0,0],[.48,.02],[.53,.12],[.50,.19],[.38,.28],[.31,.50],[.28,.74],[0,.84]],mat));addBaseDetails(g,trim);
      const neck=new T.Mesh(new T.CapsuleGeometry(.25,.62,12,28),mat);neck.position.set(.02,1.15,.01);neck.rotation.z=-.34;neck.castShadow=true;g.add(neck);
      const head=new T.Mesh(new T.SphereGeometry(.35,40,28),mat);head.scale.set(.82,1.15,.72);head.position.set(.19,1.55,0);head.rotation.z=-.16;head.castShadow=true;g.add(head);
      const muzzle=new T.Mesh(new T.CapsuleGeometry(.15,.38,10,24),mat);muzzle.rotation.z=Math.PI/2.45;muzzle.position.set(.43,1.48,0);muzzle.castShadow=true;g.add(muzzle);
      const earGeo=new T.ConeGeometry(.09,.28,24);for(const z of [-.14,.14]){const ear=new T.Mesh(earGeo,mat);ear.position.set(.10,1.92,z);ear.rotation.z=-.16;ear.castShadow=true;g.add(ear)}
      const eyeMat=new T.MeshStandardMaterial({color:0xffffff,emissive:trim.emissive,emissiveIntensity:4});for(const z of [-.235,.235]){const eye=new T.Mesh(new T.SphereGeometry(.035,16,12),eyeMat);eye.position.set(.38,1.63,z);g.add(eye)}
      return g;
    }
    function crown(g,mat,trim,type){
      if(type==='k'){
        const stem=new T.Mesh(new T.BoxGeometry(.13,.50,.13),trim),bar=new T.Mesh(new T.BoxGeometry(.45,.13,.13),trim);stem.position.y=2.10;bar.position.y=2.17;stem.castShadow=bar.castShadow=true;g.add(stem,bar);
      }else if(type==='q'){
        for(let i=0;i<8;i++){const a=i*Math.PI/4;const spike=new T.Mesh(new T.ConeGeometry(.075,.30,18),mat);spike.position.set(Math.cos(a)*.26,1.91,Math.sin(a)*.26);spike.rotation.z=Math.cos(a)*.22;spike.rotation.x=Math.sin(a)*.22;spike.castShadow=true;g.add(spike)}
        const orb=new T.Mesh(new T.SphereGeometry(.13,24,18),trim);orb.position.y=2.08;orb.castShadow=true;g.add(orb);
      }else if(type==='b'){
        const head=new T.Mesh(new T.SphereGeometry(.19,32,24),mat);head.scale.y=1.2;head.position.y=1.76;head.castShadow=true;g.add(head);
        const slit=new T.Mesh(new T.BoxGeometry(.055,.34,.30),trim);slit.position.set(.03,1.79,0);slit.rotation.z=-.46;g.add(slit);
      }else if(type==='r'){
        for(let i=0;i<6;i++){const a=i*Math.PI/3;const block=new T.Mesh(new T.BoxGeometry(.20,.27,.24),mat);block.position.set(Math.cos(a)*.34,1.57,Math.sin(a)*.34);block.rotation.y=-a;block.castShadow=true;g.add(block)}
        addRing(g,1.45,.43,trim);
      }
    }
    function createPiece(type,color){
      const mat=color==='blue'?matBlue:matRed,trim=color==='blue'?trimBlue:trimRed;
      let g=type==='n'?createKnight(mat,trim):new T.Group();
      if(type!=='n'){g.add(lathe(profiles[type]||profiles.p,mat));addBaseDetails(g,trim);crown(g,mat,trim,type)}
      g.userData.baseY=.21;g.userData.phase=Math.random()*Math.PI*2;
      return g;
    }

    const unicodeMap={'♙':['p','blue'],'♖':['r','blue'],'♘':['n','blue'],'♗':['b','blue'],'♕':['q','blue'],'♔':['k','blue'],'♟':['p','red'],'♜':['r','red'],'♞':['n','red'],'♝':['b','red'],'♛':['q','red'],'♚':['k','red']};
    let signature='';
    function disposeObject(obj){obj.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!Array.isArray(o.material))o.material.dispose?.()})}
    function syncPieces(){
      const squares=[...boardEl.querySelectorAll('.sq')],next=squares.map(s=>s.textContent.trim()).join('|');
      if(next===signature)return;signature=next;
      while(piecesGroup.children.length){const ch=piecesGroup.children.pop();disposeObject(ch)}
      squares.forEach((sq,i)=>{const token=sq.textContent.trim(),info=unicodeMap[token];if(!info)return;const row=Math.floor(i/8),col=i%8,p=createPiece(info[0],info[1]);p.position.set(col-3.5,.21,row-3.5);p.scale.setScalar(.70);piecesGroup.add(p)});
    }

    const obs=new MutationObserver(syncPieces);obs.observe(boardEl,{childList:true,subtree:true,characterData:true});
    setInterval(syncPieces,500);syncPieces();

    let targetYaw=0,targetPitch=0,pointerDown=false,lastX=0,lastY=0;
    shell.addEventListener('pointerdown',e=>{if(e.target.closest('.sq'))return;pointerDown=true;lastX=e.clientX;lastY=e.clientY});
    window.addEventListener('pointerup',()=>pointerDown=false);
    window.addEventListener('pointermove',e=>{if(!pointerDown)return;targetYaw+=(e.clientX-lastX)*.0025;targetPitch=Math.max(-.18,Math.min(.2,targetPitch+(e.clientY-lastY)*.0018));lastX=e.clientX;lastY=e.clientY});

    function resize(){const r=mount.getBoundingClientRect();if(!r.width)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
    new ResizeObserver(resize).observe(mount);resize();

    const clock=new T.Clock();let yaw=0,pitch=0;
    function animate(){
      requestAnimationFrame(animate);const t=clock.getElapsedTime();yaw+=(targetYaw-yaw)*.035;pitch+=(targetPitch-pitch)*.035;
      camera.position.x=Math.sin(yaw)*10.6;camera.position.z=Math.cos(yaw)*10.6;camera.position.y=10.9+pitch*8;camera.lookAt(0,.35,0);
      piecesGroup.children.forEach((p,i)=>{p.position.y=p.userData.baseY+Math.sin(t*1.25+p.userData.phase)*.006;p.rotation.y=Math.sin(t*.4+i*.31)*.008});
      blueStrip.material.emissiveIntensity=8.5+Math.sin(t*1.8)*1.5;redStrip.material.emissiveIntensity=8.5+Math.cos(t*1.65)*1.5;
      renderer.render(scene,camera);
    }
    animate();
  }
  boot();
})();