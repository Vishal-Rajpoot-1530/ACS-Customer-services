import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Download, 
  Video, 
  Clock, 
  Film, 
  AlertCircle,
  Loader2,
  Sparkles,
  Sliders
} from 'lucide-react';

interface RealVideoPlayerProps {
  src: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  onDownload?: () => void;
}

export const RealVideoPlayer: React.FC<RealVideoPlayerProps> = ({
  src,
  fileName,
  fileSize,
  fileType,
  onDownload
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number } | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setHasError(false);
    setIsLoading(true);
    setVideoResolution(null);
  }, [src]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((err) => {
        console.warn('Video play prevented or failed:', err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      setVideoResolution({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      });
      setIsLoading(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMute = !isMuted;
    setIsMuted(newMute);
    videoRef.current.muted = newMute;
    if (!newMute && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const restartVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => {});
  };

  const ext = (fileName.split('.').pop() || 'VIDEO').toUpperCase();

  return (
    <div 
      ref={containerRef}
      className="w-full bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col font-sans"
    >
      {/* 1. Header Bar: File Details, Quality Tag & Actions */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 text-slate-200">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Film className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-xs sm:text-sm truncate max-w-[200px] sm:max-w-md" title={fileName}>
                {fileName}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] uppercase border border-amber-500/40 shrink-0">
                {ext}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
              {videoResolution && (
                <span>
                  {videoResolution.width}×{videoResolution.height}
                  {videoResolution.height >= 1080 ? ' (Full HD)' : videoResolution.height >= 720 ? ' (HD)' : ''}
                </span>
              )}
              {fileSize && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(fileSize)}</span>
                </>
              )}
              {duration > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400 inline" />
                    <span>{formatTime(duration)}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action: Download */}
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
            title="Download Video File"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
        )}
      </div>

      {/* 2. Main Video Viewport Stage */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden group select-none">
        {src ? (
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={(e) => {
              console.warn('HTML5 Video Error:', e);
              setHasError(true);
              setIsLoading(false);
            }}
            playsInline
            preload="auto"
          />
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center">
            <Video className="w-12 h-12 text-slate-600 mb-2 animate-pulse" />
            <p className="font-bold text-slate-300">Video source not found</p>
            <p className="text-[11px] text-slate-500 mt-1">Please re-upload this file to enable playback</p>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-2" />
            <span className="text-xs font-semibold text-slate-200">Buffering video stream...</span>
          </div>
        )}

        {/* Error Fallback */}
        {hasError && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Browser Playback Notice</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                This video format ({ext}) or its internal codec cannot be directly streamed by this browser engine. You can download the full video file to play on your computer.
              </p>
            </div>
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download & Play on Device</span>
              </button>
            )}
          </div>
        )}

        {/* Big Center Play Button Overlay when Paused */}
        {!isPlaying && !isLoading && !hasError && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute z-20 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/90 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xl transition-transform transform hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-sm"
            aria-label="Play video"
          >
            <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
          </button>
        )}
      </div>

      {/* 3. Sleek Video Controls Toolbar */}
      <div className="p-3 bg-slate-900/95 border-t border-slate-800/90 flex flex-col space-y-2">
        {/* Progress Scrubber */}
        <div className="flex items-center space-x-2.5">
          <span className="text-[11px] font-mono text-slate-400 min-w-[38px] text-right">
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            disabled={hasError || isLoading}
            className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
            aria-label="Seek video progress"
          />

          <span className="text-[11px] font-mono text-slate-400 min-w-[38px]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Play / Pause */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={hasError || isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 transition-colors cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>

            {/* Restart */}
            <button
              type="button"
              onClick={restartVideo}
              disabled={hasError || isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Restart Video from Beginning"
              aria-label="Restart video"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Volume & Mute */}
            <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={toggleMute}
                className="text-slate-300 hover:text-amber-400 cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
                aria-label="Adjust volume"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 relative">
            {/* Playback Speed Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold font-mono transition-colors cursor-pointer border border-slate-700"
                title="Playback Speed"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-slate-800 border border-slate-700 rounded-xl p-1 shadow-xl flex flex-col space-y-0.5 z-30 min-w-[75px]">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changePlaybackRate(rate)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono text-left font-bold transition-colors cursor-pointer ${
                        playbackRate === rate 
                          ? 'bg-amber-500 text-slate-950' 
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="Fullscreen Mode"
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
