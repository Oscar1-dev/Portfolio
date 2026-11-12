import sharp from 'sharp'; import fs from 'fs';
const names=['f-slotted-disc','g-slotted-disc-tilt','h-slotted-square','d-folded-n','b-exploded-n'];
const inner=n=>fs.readFileSync(n+'.svg','utf8').replace(/<svg[^>]*>/, m=>m);
let out=`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="640" font-family="Arial" font-size="15">`;
out+=`<rect width="1500" height="320" fill="#0b0b0f"/><rect y="320" width="1500" height="320" fill="#ece8df"/>`;
names.forEach((n,i)=>{ const x=i*300; for(const [y,col,cutc] of [[0,'#f2f0ee','#0b0b0f'],[320,'#111116','#ece8df']]){
 const svg=inner(n).replace('<svg ',`<svg width="150" height="150" x="${x+40}" y="${y+50}" color="${col}" style="--cut:${cutc}" `).replace(/var\(--cut,#0b0b0f\)/g,cutc);
 const small=inner(n).replace('<svg ',`<svg width="32" height="32" x="${x+220}" y="${y+60}" color="${col}" `).replace(/var\(--cut,#0b0b0f\)/g,cutc);
 const tiny=inner(n).replace('<svg ',`<svg width="16" height="16" x="${x+228}" y="${y+110}" color="${col}" `).replace(/var\(--cut,#0b0b0f\)/g,cutc);
 out+=svg+small+tiny+`<text x="${x+40}" y="${y+250}" fill="${col}">${n}</text>`; }});
out+='</svg>';
await sharp(Buffer.from(out)).png().toFile('concept-sheet-2.png');
