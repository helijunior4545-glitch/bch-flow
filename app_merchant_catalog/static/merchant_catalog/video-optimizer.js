/* Native local preview conversion, without third-party uploads or WASM downloads. */
window.BCHVideoOptimizer = async (file,signal) => {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw Error('unsupported');
  const mime=['video/webm;codecs=vp8','video/mp4;codecs=avc1.42E01E','video/mp4','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
  if (!mime) throw Error('unsupported');
  const source=URL.createObjectURL(file),video=document.createElement('video');
  video.muted=true;video.playsInline=true;video.preload='auto';
  let stream,recorder,timer,frame,settled=false;
  try {
    return await new Promise((resolve,reject)=>{
      const fail=error=>{if(settled)return;settled=true;reject(error);};
      const abort=()=>fail(new DOMException('Cancelled','AbortError'));
      signal?.addEventListener('abort',abort,{once:true});
      timer=setTimeout(()=>fail(Error('timeout')),45000);
      video.onerror=()=>fail(Error('decode'));
      video.onloadeddata=async()=>{
        if(settled)return;
        const canvas=document.createElement('canvas'),ratio=Math.min(1,960/video.videoWidth,540/video.videoHeight);
        canvas.width=Math.max(2,Math.floor(video.videoWidth*ratio/2)*2);
        canvas.height=Math.max(2,Math.floor(video.videoHeight*ratio/2)*2);
        const context=canvas.getContext('2d',{alpha:false});
        try{
          context.drawImage(video,0,0,canvas.width,canvas.height);
          stream=canvas.captureStream(24);
          recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:900000});
          const chunks=[];
          recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
          recorder.onerror=()=>fail(Error('encode'));
          recorder.onstop=()=>{
            if(settled)return;
            const blob=new Blob(chunks,{type:mime.split(';')[0]});
            if(!blob.size || blob.size>4*1024*1024){fail(Error('size'));return;}
            settled=true;
            resolve(new File([blob],mime.startsWith('video/mp4')?'preview.mp4':'preview.webm',{type:blob.type}));
          };
          const stop=()=>{video.pause();if(recorder.state!=='inactive')recorder.stop();};
          const draw=()=>{
            if(settled || video.ended)return;
            context.drawImage(video,0,0,canvas.width,canvas.height);
            if(video.currentTime>=20){stop();return;}
            frame=requestAnimationFrame(draw);
          };
          video.onended=stop;
          recorder.start(250);
          await video.play();
          draw();
        }catch(error){fail(error);}
      };
      video.src=source;
      if(signal?.aborted)abort();
    });
  }finally{
    clearTimeout(timer);cancelAnimationFrame(frame);
    video.pause();
    if(recorder && recorder.state!=='inactive')recorder.stop();
    stream?.getTracks().forEach(track=>track.stop());
    video.removeAttribute('src');video.load();URL.revokeObjectURL(source);
  }
};
