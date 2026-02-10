
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Upload, AlertCircle, CheckCircle2, XCircle, Zap, Eye, EyeOff, Cpu } from 'lucide-react';
import { InspectionResult } from '../types';

interface InspectionViewProps {
  onInspect: (imageData: string) => Promise<void>;
  isAnalyzing: boolean;
  lastResult?: InspectionResult;
}

const InspectionView: React.FC<InspectionViewProps> = ({ onInspect, isAnalyzing, lastResult }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAutoScan, setIsAutoScan] = useState(false);
  const autoScanTimer = useRef<NodeJS.Timeout | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
        audio: false
      });
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("Please allow camera access to use live inspection.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
      setIsAutoScan(false);
    }
  };

  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  const captureAndInspect = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    const width = videoRef.current.videoWidth;
    const height = videoRef.current.videoHeight;
    
    if (width === 0 || height === 0) return;

    canvasRef.current.width = width;
    canvasRef.current.height = height;
    
    context.drawImage(videoRef.current, 0, 0, width, height);
    
    const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
    await onInspect(imageData);
  }, [isAnalyzing, onInspect]);

  useEffect(() => {
    if (isAutoScan && !isAnalyzing && isCameraActive) {
      autoScanTimer.current = setTimeout(() => {
        captureAndInspect();
      }, 4000);
    }
    return () => {
      if (autoScanTimer.current) clearTimeout(autoScanTimer.current);
    };
  }, [isAutoScan, isAnalyzing, isCameraActive, captureAndInspect]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const displayWidth = video.clientWidth;
      const displayHeight = video.clientHeight;
      
      if (displayWidth > 0 && displayHeight > 0 && (canvas.width !== displayWidth || canvas.height !== displayHeight)) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (lastResult && lastResult.defects.length > 0) {
        lastResult.defects.forEach((defect) => {
          if (defect.boundingBox) {
            const [ymin, xmin, ymax, xmax] = defect.boundingBox;
            
            const x = (xmin / 1000) * canvas.width;
            const y = (ymin / 1000) * canvas.height;
            const w = ((xmax - xmin) / 1000) * canvas.width;
            const h = ((ymax - ymin) / 1000) * canvas.height;

            const color = defect.severity === 'high' ? '#ef4444' : (defect.severity === 'medium' ? '#f59e0b' : '#3b82f6');
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);

            ctx.lineWidth = 4;
            const cornerSize = 10;
            ctx.beginPath();
            ctx.moveTo(x, y + cornerSize); ctx.lineTo(x, y); ctx.lineTo(x + cornerSize, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + w - cornerSize, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerSize);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + w, y + h - cornerSize); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - cornerSize, y + h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + cornerSize, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - cornerSize);
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.font = 'bold 12px Inter, sans-serif';
            const label = `${defect.type.toUpperCase()}`;
            const textMetrics = ctx.measureText(label);
            ctx.fillRect(x, y - 22, textMetrics.width + 10, 22);
            ctx.fillStyle = '#fff';
            ctx.fillText(label, x + 5, y - 7);
          }
        });
      }
      requestAnimationFrame(draw);
    };

    const animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [lastResult]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      await onInspect(imageData);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div className="space-y-6">
        <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative aspect-video flex items-center justify-center border-4 border-slate-800">
          {isCameraActive ? (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${isAnalyzing ? 'opacity-60' : 'opacity-100'}`}
              />
              <canvas 
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">
                  <div className={`w-2 h-2 rounded-full ${isAutoScan ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                  <span className="text-white text-[10px] font-black uppercase tracking-widest">
                    {isAutoScan ? 'Continuous Monitoring' : 'Live System'}
                  </span>
                </div>
                
                {lastResult && (
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div className={`px-4 py-2 rounded-2xl backdrop-blur-md border ${
                      lastResult.status === 'PASS' ? 'bg-emerald-500/80 border-emerald-400' : 'bg-rose-500/80 border-rose-400'
                    } text-white shadow-lg`}>
                      <p className="text-[10px] font-bold uppercase opacity-80">System Verdict</p>
                      <p className="text-lg font-black">{lastResult.status} ({(lastResult.confidence * 100).toFixed(0)}%)</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center p-8">
              <Camera className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <button 
                onClick={startCamera}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-2xl transition-all shadow-lg shadow-blue-500/20"
              >
                Initialize Inspection Feed
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-[2px] z-20">
              <RefreshCw className="w-12 h-12 text-white animate-spin mb-4" />
              <p className="text-white font-black text-xl tracking-tighter">AI IDENTIFYING & SCANNING...</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                 <Cpu className="w-4 h-4 text-blue-500" />
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dynamic Component Sensing Active</span>
               </div>
               <button 
                 onClick={() => setIsAutoScan(!isAutoScan)}
                 disabled={!isCameraActive}
                 className={`flex items-center gap-2 text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                   isAutoScan 
                    ? 'bg-amber-100 text-amber-700 border-amber-200' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                 }`}
               >
                 {isAutoScan ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                 Auto-Scan: {isAutoScan ? 'ON' : 'OFF'}
               </button>
            </div>
            
            <div className="flex gap-3">
              <button 
                disabled={!isCameraActive || isAnalyzing}
                onClick={captureAndInspect}
                className="flex-[2] bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95"
              >
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                CAPTURE & ANALYZE
              </button>
              
              <label className="flex-1 bg-white border-2 border-slate-200 hover:border-blue-500 text-slate-600 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm">
                <Upload className="w-5 h-5" />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>
            </div>
            
            {isCameraActive && (
              <button 
                onClick={stopCamera}
                className="w-full text-rose-500 text-xs font-bold uppercase tracking-widest hover:text-rose-600"
              >
                Stop Camera Feed
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {lastResult ? (
          <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
            <div className={`p-6 flex items-center justify-between ${
              lastResult.status === 'PASS' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              <div className="flex items-center gap-4">
                {lastResult.status === 'PASS' ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                <div>
                  <h3 className="text-3xl font-black tracking-tighter uppercase">{lastResult.status}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold px-2 py-0.5 bg-white/20 rounded-md">AI Certified</span>
                    <span className="text-xs opacity-80">Conf: {(lastResult.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase opacity-70">Unit Ref</p>
                <p className="font-mono text-xs">{lastResult.id}</p>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identified Product</p>
                    <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">Auto-Detected</span>
                  </div>
                  <p className="text-slate-800 font-black">{lastResult.productType}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase mb-4 flex items-center gap-2 tracking-widest">
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                  Spatial Anomaly Report
                </h4>
                {lastResult.defects.length > 0 ? (
                  <div className="space-y-3">
                    {lastResult.defects.map((defect, i) => (
                      <div key={i} className={`flex gap-4 p-4 border rounded-2xl transition-all ${
                        defect.severity === 'high' ? 'bg-rose-50 border-rose-100 shadow-sm' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                          defect.severity === 'high' ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse' : 
                          defect.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-400'
                        }`}></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-black text-slate-800 text-sm uppercase">{defect.type}</p>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                              defect.severity === 'high' ? 'bg-rose-600 text-white' : 
                              defect.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {defect.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-normal font-medium">{defect.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-emerald-50 p-8 rounded-3xl text-center border border-emerald-100">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-emerald-800 font-black uppercase tracking-tight">Zero Anomalies</p>
                    <p className="text-emerald-600/70 text-xs font-medium">Surface integrity confirmed for {lastResult.productType}.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">System Idle</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">
              Ready for autonomous inspection. Point camera at any component and trigger <b>Capture</b> for instant identification and defect analysis.
            </p>
          </div>
        )}

        <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative shadow-lg">
          <div className="relative z-10 flex items-start gap-4">
            <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
               <AlertCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Dynamic Engine</p>
              <p className="text-xs font-medium leading-relaxed text-slate-300">
                The VisionQC model now uses multi-stage inference to identify product geometry and surface material automatically. No manual presets required.
              </p>
            </div>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default InspectionView;
