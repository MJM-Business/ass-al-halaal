export const MAX_UPLOAD_BYTES=5*1024*1024;

const SIGNATURES={
  'image/png':{
    ext:'.png',
    test:buffer=>buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
  },
  'image/jpeg':{
    ext:'.jpg',
    test:buffer=>buffer.length>=3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff
  },
  'image/webp':{
    ext:'.webp',
    test:buffer=>buffer.length>=12&&buffer.subarray(0,4).toString('ascii')==='RIFF'&&buffer.subarray(8,12).toString('ascii')==='WEBP'
  }
};

export function validateImageUpload({contentType,buffer}={}){
  const mime=String(contentType||'').split(';')[0].trim().toLowerCase();
  const rule=SIGNATURES[mime];
  if(!rule)throw new Error('Unsupported image type');
  if(!Buffer.isBuffer(buffer))throw new Error('Upload body must be binary');
  if(buffer.length<1)throw new Error('Upload is empty');
  if(buffer.length>MAX_UPLOAD_BYTES)throw new Error('Upload exceeds 5 MB limit');
  if(!rule.test(buffer))throw new Error('File content does not match declared image type');
  return {mime,ext:rule.ext,size:buffer.length};
}

export function safeStoredFilename(id,ext){
  const cleanId=String(id||'').toLowerCase();
  const cleanExt=String(ext||'').toLowerCase();
  if(!/^[a-f0-9-]{20,64}$/.test(cleanId))throw new Error('Invalid storage identifier');
  if(!['.png','.jpg','.webp'].includes(cleanExt))throw new Error('Invalid storage extension');
  return cleanId+cleanExt;
}
