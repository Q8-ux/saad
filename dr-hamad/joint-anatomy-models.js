// Original educational geometry for Dr Hamad. Proportions are schematic.
// Anatomy references: AAOS OrthoInfo, Total Knee Replacement / Total Hip Replacement.
import * as THREE from './vendor/three/three.module.min.js';

export const anatomy = {
  knee: {
    name: 'الركبة', latin: 'KNEE ANATOMY',
    intro: 'يلتقي عظم الفخذ والظنبوب والرضفة في مفصل الركبة. اختر جزءًا لتتعرّف إلى وظيفته، وأدر النموذج لرؤيته من زاوية أخرى.',
    source: 'https://orthoinfo.aaos.org/en/treatment/total-knee-replacement/',
    parts: [
      ['femur', 'عظم الفخذ', 'Femur', 'يشكّل الطرف السفلي لعظم الفخذ الجزء العلوي من مفصل الركبة.', 'bone'],
      ['tibia', 'عظم الظنبوب', 'Tibia', 'يشكّل الطرف العلوي للظنبوب سطحًا يحمل عظم الفخذ وينقل الحمل إلى الساق.', 'bone'],
      ['patella', 'الرُّضفة', 'Patella', 'عظمة أمام مفصل الركبة، تتحرك أمام طرف عظم الفخذ ضمن جهاز بسط الركبة.', 'bone'],
      ['fibula', 'عظم الشظية', 'Fibula', 'يقع إلى جانب الظنبوب. يظهر هنا لتوضيح علاقته بعظام الساق؛ ولا يشكّل سطح التحميل بين الفخذ والظنبوب.', 'bone'],
      ['cartilage', 'الغضروف المفصلي', 'Articular cartilage', 'يغطي أسطح العظام داخل المفصل ويساعدها على الانزلاق بسلاسة. يظهر بلون أزرق للتوضيح.', 'cartilage'],
      ['meniscus', 'الغضروفان الهلاليان', 'Menisci', 'يقعان بين الفخذ والظنبوب، ويساعدان على توزيع الحمل وامتصاص الصدمات. يختلفان عن الغضروف الذي يغطي سطح العظم.', 'cartilage'],
      ['ligaments', 'الأربطة الداعمة', 'Ligaments', 'تربط العظام وتساعد على ثبات الركبة. يعرض النموذج اتجاهات مبسطة لبعض الأربطة، دون إظهار كل الأنسجة.', 'ligament'],
    ],
  },
  hip: {
    name: 'الحوض والورك', latin: 'HIP ANATOMY',
    intro: 'الورك مفصل كروي: رأس عظم الفخذ يتحرك داخل تجويف الحُق في الحوض. افصل الأجزاء تدريجيًا لترى هذه العلاقة.',
    source: 'https://orthoinfo.aaos.org/en/treatment/total-hip-replacement/',
    parts: [
      ['pelvis', 'عظم الحوض', 'Pelvis', 'يحتوي عظم الحوض على الحُق الذي يستقبل رأس عظم الفخذ. المعروض جزء مبسط من أحد جانبي الحوض.', 'bone'],
      ['socket', 'الحُقّ', 'Acetabulum', 'تجويف في عظم الحوض يستقبل رأس عظم الفخذ. فُصل بصريًا عن الحوض هنا لتوضيح شكل التجويف، وليس عظمة مستقلة.', 'bone'],
      ['head', 'رأس عظم الفخذ', 'Femoral head', 'الجزء الكروي في أعلى عظم الفخذ. فُصل بصريًا هنا لتوضيح علاقته بالتجويف، وهو جزء من عظم الفخذ.', 'bone'],
      ['femur', 'عظم الفخذ وعنقه', 'Femur and neck', 'يتصل رأس الفخذ بجسم العظم عبر العنق. يعرض النموذج العلاقة العامة بين الرأس والعنق وجسم العظم.', 'bone'],
      ['cartilage', 'الغضروف المفصلي', 'Articular cartilage', 'يغطي الأسطح المتقابلة لرأس عظم الفخذ والحُق ويساعد على الحركة السلسة. اللون الأزرق للتوضيح.', 'cartilage'],
      ['capsule', 'محفظة المفصل', 'Joint capsule', 'غلاف من أنسجة داعمة يحيط بالمفصل ويسهم في ثباته. يُعرض جزء شفاف ومبسط حتى تبقى العظام مرئية.', 'ligament'],
    ],
  },
};

const colors = { bone: 0xeee5d4, cartilage: 0x65bac4, ligament: 0xc6ae73, meniscus: 0x21888b };
let simplified = false;
function material(color, opacity = 1) {
  return new THREE.MeshStandardMaterial({ color, roughness: .48, metalness: .02,
    transparent: opacity < 1, opacity, depthWrite: opacity === 1, side: THREE.DoubleSide });
}
function mesh(group, geometry, color, position = [0, 0, 0], scale = [1, 1, 1], opacity = 1) {
  const item = new THREE.Mesh(geometry, material(color, opacity));
  item.position.set(...position); item.scale.set(...scale);
  item.castShadow = true; item.receiveShadow = true;
  item.userData.part = group.userData.part;
  group.add(item); return item;
}
function sphere(group, position, scale, color = colors.bone, opacity = 1) {
  return mesh(group, new THREE.SphereGeometry(1, simplified ? 16 : 40, simplified ? 12 : 28), color, position, scale, opacity);
}
function shaft(group, points, position, scale = [1, 1, 1]) {
  return mesh(group, new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), simplified ? 18 : 40), colors.bone, position, scale);
}
function bridge(group, from, to, radius, color, opacity = 1) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const item = mesh(group, new THREE.CylinderGeometry(radius, radius * .95, a.distanceTo(b), simplified ? 8 : 16), color,
    a.clone().add(b).multiplyScalar(.5).toArray(), [1, 1, 1], opacity);
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return item;
}
function ring(group, center, start, color) {
  const points = Array.from({ length: 40 }, (_, i) => {
    const a = start + i / 39 * Math.PI * 1.5;
    return new THREE.Vector3(center[0] + .245 * Math.cos(a), center[1], center[2] + .32 * Math.sin(a));
  });
  return mesh(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), simplified ? 20 : 48, .065, simplified ? 6 : 12, false), color);
}

export function buildJoint(id, options = {}) {
  simplified = Boolean(options.simplified);
  const root = new THREE.Group(), parts = new Map();
  function part(key, anchor, explode) {
    const group = new THREE.Group();
    group.userData = { part: key, anchor: new THREE.Vector3(...anchor), explode: new THREE.Vector3(...explode) };
    root.add(group); parts.set(key, group); return group;
  }
  if (id === 'knee') {
    const femur = part('femur', [-.1, 1.9, .28], [0, 1.05, 0]);
    shaft(femur, [[0, .75], [.38, .8], [.3, 1.1], [.25, 1.7], [.29, 2.6], [.32, 2.85], [0, 2.9]], [0, 0, -.03], [1, 1, .86]);
    sphere(femur, [-.34, .62, 0], [.39, .5, .43]);
    sphere(femur, [.34, .62, 0], [.39, .5, .43]);
    sphere(femur, [0, .92, -.1], [.52, .38, .36]);
    const tibia = part('tibia', [-.1, -1.55, .28], [0, -1.05, 0]);
    shaft(tibia, [[0, -2.75], [.21, -2.7], [.19, -2.2], [.22, -1.3], [.29, -.75], [.47, -.43], [.47, -.28], [0, -.22]], [0, 0, -.04], [1, 1, .82]);
    sphere(tibia, [0, -.31, -.04], [.64, .17, .43]);
    const patella = part('patella', [0, .48, .8], [0, .08, 1.12]);
    sphere(patella, [0, .5, .65], [.25, .34, .16]);
    const fibula = part('fibula', [.77, -1.6, .06], [.65, -.7, 0]);
    sphere(fibula, [.79, -.66, -.03], [.13, .2, .15]);
    bridge(fibula, [.78, -.77, -.03], [.69, -2.7, -.04], .075, colors.bone);
    const cartilage = part('cartilage', [.4, .14, .36], [0, .12, .7]);
    for (const x of [-.34, .34]) {
      mesh(cartilage, new THREE.SphereGeometry(1, simplified ? 16 : 40, simplified ? 6 : 14, 0, Math.PI * 2, Math.PI * .5, Math.PI * .5), colors.cartilage, [x, .62, 0], [.42, .53, .46]);
      sphere(cartilage, [x * .88, -.13, -.02], [.29, .035, .36], colors.cartilage);
    }
    const meniscus = part('meniscus', [-.42, -.01, .35], [-.95, -.18, .15]);
    ring(meniscus, [-.31, -.01, -.01], -.7, colors.meniscus);
    ring(meniscus, [.31, -.01, -.01], Math.PI - .7, colors.meniscus);
    const ligaments = part('ligaments', [.62, .35, .05], [1.02, .05, -.15]);
    bridge(ligaments, [-.13, -.12, -.14], [.16, .71, .15], .046, colors.ligament);
    bridge(ligaments, [.12, -.12, .17], [-.15, .72, -.16], .046, colors.ligament);
    bridge(ligaments, [-.61, .65, 0], [-.51, -.52, .01], .052, colors.ligament);
    bridge(ligaments, [.63, .63, -.03], [.78, -.63, -.03], .047, colors.ligament);
  } else {
    const pelvis = part('pelvis', [1.02, 2.04, .25], [.65, .5, -.15]);
    const outline = new THREE.Shape();
    outline.moveTo(.28, 1.13);
    outline.bezierCurveTo(.15, 1.68, .35, 2.55, 1.22, 2.55);
    outline.bezierCurveTo(2.08, 2.55, 1.9, 1.87, 1.35, 1.42);
    outline.bezierCurveTo(1.12, 1.19, 1.64, .55, 1.45, -.03);
    outline.bezierCurveTo(1.3, -.55, .59, -.32, .45, .02);
    outline.lineTo(.4, .38); outline.lineTo(.67, .52); outline.lineTo(.71, .9); outline.closePath();
    const hole = new THREE.Path(); hole.absellipse(1.02, .16, .23, .29, 0, Math.PI * 2, true); outline.holes.push(hole);
    mesh(pelvis, new THREE.ExtrudeGeometry(outline, { depth: .27, bevelEnabled: true, bevelSize: .12, bevelThickness: .09, bevelSegments: simplified ? 2 : 4, curveSegments: simplified ? 12 : 32 }), colors.bone, [0, 0, -.22]);
    const socket = part('socket', [.36, .92, .39], [.45, .15, .2]);
    const cup = mesh(socket, new THREE.SphereGeometry(.57, simplified ? 16 : 40, simplified ? 12 : 28, 0, Math.PI * 2, 0, Math.PI * .5), colors.bone, [0, .72, 0]);
    cup.rotation.z = -Math.PI / 2;
    const head = part('head', [-.22, .81, .4], [-.7, .23, .25]);
    sphere(head, [0, .72, 0], [.435, .435, .435]);
    const femur = part('femur', [-1.05, -1.15, .26], [-.6, -.9, 0]);
    bridge(femur, [-.98, -.04, 0], [-.27, .49, 0], .19, colors.bone);
    sphere(femur, [-1.12, -.02, -.03], [.26, .4, .26]);
    shaft(femur, [[0, -2.55], [.22, -2.5], [.2, -1.8], [.24, -.8], [.29, -.2], [.27, .1], [0, .18]], [-.97, 0, -.03], [1, 1, .9]);
    const cartilage = part('cartilage', [-.39, .98, .22], [0, .8, .55]);
    const lining = mesh(cartilage, new THREE.SphereGeometry(.449, simplified ? 16 : 40, simplified ? 12 : 28, 0, Math.PI * 2, 0, Math.PI * .53), colors.cartilage, [0, .72, 0]);
    lining.rotation.z = -Math.PI / 2;
    const capsule = part('capsule', [-.52, .18, .35], [-.15, -.05, .95]);
    bridge(capsule, [-.88, .03, 0], [-.04, .68, 0], .45, colors.ligament, .14);
  }
  return { root, parts };
}

export function disposeJoint(root) {
  root.traverse(item => {
    item.geometry?.dispose();
    if (item.material) for (const mat of [item.material].flat()) mat.dispose();
  });
}
