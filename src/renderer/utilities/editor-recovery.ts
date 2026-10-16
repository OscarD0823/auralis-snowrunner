export type XmlDraft={version:1;baseline:string;xml:string;updated:number};
const key=(path:string)=>'snowrunner-studio-xml-recovery:'+path;
export function readXmlDraft(storage:Pick<Storage,'getItem'>,path:string):XmlDraft|undefined{try{const v=JSON.parse(storage.getItem(key(path))??'null');if(v?.version===1&&typeof v.baseline==='string'&&typeof v.xml==='string'&&Number.isFinite(v.updated))return v;}catch{/* A corrupt draft never replaces game data. */}}
export function writeXmlDraft(storage:Pick<Storage,'setItem'|'removeItem'>,path:string,baseline:string,xml:string){if(xml===baseline)storage.removeItem(key(path));else storage.setItem(key(path),JSON.stringify({version:1,baseline,xml,updated:Date.now()}));}
