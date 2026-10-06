import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {releaseFiles,outsideRelease,guideAdditions} from './sellers-release-policy.mjs';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const git=args=>execFileSync('git',args,{cwd,encoding:'utf8'});
const mode=process.argv[2]||'--staged';
if(!['--staged','--prepare','--commit'].includes(mode)){console.error('Usá --staged, --prepare o --commit.');process.exit(1);}
const names=()=>git(mode==='--commit'?['diff-tree','--no-commit-id','--name-only','-r','-z','HEAD']:['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
function validate(paths){const blocked=outsideRelease(paths);if(blocked.length)throw Error('Fuera de la publicación de Sellers:\n'+blocked.join('\n'));const sources=paths.filter(path=>/^(app|components|lib)\//.test(path));if(!sources.length)return;const diff=git(mode==='--commit'?['show','--format=','HEAD','--',...sources]:['diff','--cached','--',...sources]);if(guideAdditions(diff).length)throw Error('El diff agrega referencias a GUÍA. Separá esos cambios antes de publicar.');}
try {
  validate(names());
  if(mode==='--prepare'){const paths=releaseFiles.filter(path=>git(['status','--porcelain','--',path]).trim());if(!paths.length)throw Error('No hay cambios de Sellers para preparar.');git(['add','--',...paths]);}
  const paths=names();if(!paths.length)throw Error('No hay archivos preparados. Usá --prepare para agregar solo los archivos aprobados.');validate(paths);
  console.log('Alcance verificado: Sellers/PWA/cards; cambios de GUÍA excluidos.\n'+paths.join('\n'));
}catch(error){console.error(error.message);process.exit(1);}

