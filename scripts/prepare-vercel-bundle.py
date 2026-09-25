from pathlib import Path
import base64,json,shutil
root=Path('artifacts/vercel-bundle')
root.mkdir(parents=True,exist_ok=True)
for p in Path('dist').rglob('*'):
 if p.is_file() and p.relative_to('dist').parts[0]!='audio':
  target=root/'site'/p.relative_to('dist');target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
(root/'package.json').write_text(json.dumps({'name':'yanhuo-moonlit-wishes-release','version':'1.0.0','private':True,'type':'module','scripts':{'build':'node prepare-audio.mjs'}}))
(root/'vercel.json').write_text(json.dumps({'version':2,'framework':None,'buildCommand':'npm run build','outputDirectory':'site'}))
(root/'prepare-audio.mjs').write_text('''import {mkdir, writeFile} from 'node:fs/promises';
await mkdir('site/audio',{recursive:true});
for(const [name,url] of [
 ['rest-now','https://assets.mixkit.co/music/584/584.mp3'],
 ['meditation','https://assets.mixkit.co/music/441/441.mp3'],
 ['serene-moments','https://assets.mixkit.co/music/27/27.mp3']
]) {
 const response=await fetch(url, {signal:AbortSignal.timeout(60000)});
 if(!response.ok) throw new Error(`Music download failed: ${name} ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length<100000) throw new Error(`Incomplete music asset: ${name}`);
 await writeFile(`site/audio/${name}.mp3`,bytes);
 console.log(`Prepared ${name}: ${bytes.length} bytes`);
}
''')
files=[]
for p in sorted(root.rglob('*')):
 if p.is_file():
  binary=p.suffix in ['.jpg','.ttf']
  files.append({'file':p.relative_to(root).as_posix(),'data':base64.b64encode(p.read_bytes()).decode() if binary else p.read_text(),'encoding':'base64' if binary else 'utf-8'})
payload=json.dumps(files,ensure_ascii=True,separators=(',',':'))
Path('artifacts/vercel-files.json').write_text(payload)
print(json.dumps({'files':len(files),'characters':len(payload),'chunks':(len(payload)+63999)//64000}))
