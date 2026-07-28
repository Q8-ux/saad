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
    const mount=document.createElement('div');
    mount.id='board3d';
    mount.setAttribute('aria-hidden','true');
    shell.insertBefore(mount,boardEl);

    const scene=new T.Scene();
    scene.fog=new T.FogExp2(0x02060c,0.055);

    const camera=new T.PerspectiveCamera(34,1,0.1,100);
    camera.position.set(0,10.8,9.8);
    camera.lookAt(0,0,0);

    const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.18;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=T.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new T.HemisphereLight(0x8fdcff,0x09020b,1.15));
    const key=new T.DirectionalLight(0xffffff,2.8);key.position.set(4,10,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;scene.add(key);
    const blueLight=new T.PointLight(0x12bfff,36,18,2);blueLight.position.set(-5,3,4);scene.add(blueLight);
    const redLight=new T.PointLight(0xff263f,34,18,2);redLight.position.set(5,3,-4);scene.add(redLight);

    const floorMat=new T.MeshStandardMaterial({color:0x03070c,metalness:.88,roughness:.2});
    const floor=new T.Mesh(new T.BoxGeometry(10.2,.42,10.2),floorMat);floor.position.y=-.34;floor.castShadow=true;floor.receiveShadow=true;scene.add(floor);

    const frameMat=new T.MeshStandardMaterial({color:0x111922,metalness:1,roughness:.16,emissive:0x071625,emissiveIntensity:.8});
    const frame=new T.Mesh(new T.BoxGeometry(9.4,.24,9.4),frameMat);frame.position.y=-.08;frame.receiveShadow=true;scene.add(frame);

    const tileGeo=new T.BoxGeometry(1,0.16,1);
    const lightMat=new T.MeshStandardMaterial({color:0x263847,metalness:.62,roughness:.28});
    const darkMat=new T.MeshStandardMaterial({color:0x071019,metalness:.78,roughness:.22});
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const tile=new T.Mesh(tileGeo,(r+c)%2?darkMat:lightMat);
      tile.position.set(c-3.5,.12,r-3.5);tile.receiveShadow=true;scene.add(tile);
    }

    const blueStrip=new T.Mesh(new T.BoxGeometry(8.8,.08,.08),new T.MeshStandardMaterial({color:0x12bfff,emissive:0x12bfff,emissiveIntensity:7}));blueStrip.position.set(0,.12,4.45);scene.add(blueStrip);
    const redStrip=blueStrip.clone();redStrip.material=redStrip.material.clone();redStrip.material.color.setHex(0xff263f);redStrip.material.emissive.setHex(0xff263f);redStrip.position.z=-4.45;scene.add(redStrip);

    const piecesGroup=new T.Group();scene.add(piecesGroup);
    const matBlue=new T.MeshPhysicalMaterial({color:0x0ca9ff,metalness:.93,roughness:.14,clearcoat:1,clearcoatRoughness:.06,emissive:0x0066b8,emissiveIntensity:.48});
    const matRed=new T.MeshPhysicalMaterial({color:0xff2845,metalness:.93,roughness:.14,clearcoat:1,clearcoatRoughness:.06,emissive:0x8d001b,emissiveIntensity:.5});

    const profiles={
      p:[[0,.0],[.42,.02],[.48,.12],[.38,.22],[.30,.34],[.27,.78],[.22,1.02],[.33,1.10],[.27,1.28],[0,1.36]],
      r:[[0,0],[.48,.02],[.52,.14],[.40,.24],[.34,.95],[.48,1.03],[.48,1.30],[.36,1.42],[0,1.48]],
      b:[[0,0],[.46,.02],[.50,.14],[.38,.24],[.29,.72],[.20,1.08],[.33,1.28],[.27,1.54],[0,1.65]],
      q:[[0,0],[.50,.02],[.54,.15],[.40,.28],[.29,.90],[.22,1.28],[.36,1.45],[.28,1.70],[.12,1.86],[0,1.92]],
      k:[[0,0],[.52,.02],[.56,.15],[.42,.30],[.30,1.02],[.23,1.40],[.34,1.56],[.24,1.80],[0,1.88]]
    };

    function lathe(profile,mat){const pts=profile.map(([x,y])=>new T.Vector2(x,y));const mesh=new T.Mesh(new T.LatheGeometry(pts,48),mat);mesh.castShadow=true;mesh.receiveShadow=true;return mesh}
    function crown(group,mat,type){
      if(type==='k'){
        const v=new T.Mesh(new T.BoxGeometry(.13,.46,.13),mat),h=new T.Mesh(new T.BoxGeometry(.42,.13,.13),mat);v.position.y=2.07;h.position.y=2.13;v.castShadow=h.castShadow=true;group.add(v,h);
      }else if(type==='q'){
        for(let i=0;i<6;i++){const s=new T.Mesh(new T.SphereGeometry(.105,18,12),mat);const a=i*Math.PI/3;s.position.set(Math.cos(a)*.25,1.98,Math.sin(a)*.25);s.castShadow=true;group.add(s)}
      }
    }
    function knight(mat){
      const g=new T.Group();g.add(lathe([[0,0],[.48,.02],[.52,.15],[.38,.28],[.30,.62],[.26,.78],[0,.84]],mat));
      const neck=new T.Mesh(new T.CapsuleGeometry(.25,.58,8,18),mat);neck.position.set(.02,1.15,.02);neck.rotation.z=-.30;neck.castShadow=true;g.add(neck);
      const head=new T.Mesh(new T.SphereGeometry(.34,24,18),mat);head.scale.set(.9,1.18,.72);head.position.set(.18,1.56,0);head.castShadow=true;g.add(head);
      const muzzle=new T.Mesh(new T.CapsuleGeometry(.16,.35,6,16),mat);muzzle.rotation.z=Math.PI/2.65;muzzle.position.set(.42,1.50,0);muzzle.castShadow=true;g.add(muzzle);
      return g;
    }
    function rookTop(g,mat){for(let i=0;i<4;i++){const m=new T.Mesh(new T.BoxGeometry(.22,.25,.22),mat);const a=i*Math.PI/2;m.position.set(Math.cos(a)*.33,1.56,Math.sin(a)*.33);m.castShadow=true;g.add(m)}}
    function createPiece(type,color){
      const mat=color==='blue'?matBlue:matRed;let g=new T.Group();
      if(type==='n')g=knight(mat);else{g.add(lathe(profiles[type]||profiles.p,mat));if(type==='r')rookTop(g,mat);crown(g,mat,type)}
      const ring=new T.Mesh(new T.TorusGeometry(.38,.035,10,48),new T.MeshStandardMaterial({color:color==='blue'?0x65dcff:0xff6b80,emissive:color==='blue'?0x12bfff:0xff263f,emissiveIntensity:5,metalness:.5,roughness:.25}));ring.rotation.x=Math.PI/2;ring.position.y=.12;g.add(ring);
      return g;
    }

    const unicodeMap={'♙':['p','blue'],'♖':['r','blue'],'♘':['n','blue'],'♗':['b','blue'],'♕':['q','blue'],'♔':['k','blue'],'♟':['p','red'],'♜':['r','red'],'♞':['n','red'],'♝':['b','red'],'♛':['q','red'],'♚':['k','red']};
    let signature='';
    function syncPieces(){
      const squares=[...boardEl.querySelectorAll('.sq')];
      const next=squares.map(s=>s.textContent.trim()).join('|');
      if(next===signature)return;signature=next;
      while(piecesGroup.children.length)piecesGroup.remove(piecesGroup.children[0]);
      squares.forEach((sq,i)=>{
        const token=sq.textContent.trim(),info=unicodeMap[token];if(!info)return;
        const row=Math.floor(i/8),col=i%8,p=createPiece(info[0],info[1]);
        p.position.set(col-3.5,.21,row-3.5);p.scale.setScalar(.72);piecesGroup.add(p);
      });
    }

    const obs=new MutationObserver(syncPieces);obs.observe(boardEl,{childList:true,subtree:true,characterData:true});
    setInterval(syncPieces,650);syncPieces();

    function resize(){const r=mount.getBoundingClientRect();if(!r.width)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
    new ResizeObserver(resize).observe(mount);resize();

    let t0=performance.now();
    function animate(now){requestAnimationFrame(animate);const t=(now-t0)/1000;piecesGroup.children.forEach((p,i)=>{p.rotation.y=Math.sin(t*.55+i*.17)*.018});blueLight.intensity=34+Math.sin(t*1.8)*5;redLight.intensity=33+Math.cos(t*1.65)*5;renderer.render(scene,camera)}
    requestAnimationFrame(animate);
  }
  boot();
})();