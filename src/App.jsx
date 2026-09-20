import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  // States
  const [taka, setTaka] = useState(12.50);
  const [energy, setEnergy] = useState(1000);
  const [isNightMode, setIsNightMode] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [flagTapAnim, setFlagTapAnim] = useState(false);

  // Modals state
  const [alertData, setAlertData] = useState({ show: false, message: '', type: 'warn', title: '' });
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  // Withdraw form state
  const [withdrawMethod, setWithdrawMethod] = useState('bKash');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');

  const maxEnergy = 1000;
  const takaPerTap = 0.25;
  const audioCtxRef = useRef(null);

  // কোন গাছটি শেক করছে তা ট্র্যাক করার স্টেট
  const [shakingTree, setShakingTree] = useState(null);

  const handleTreeClick = (treeIndex, e) => {
    e.stopPropagation(); // যাতে কয়েনের ট্যাপ ট্রিগার না হয়
    setShakingTree(treeIndex);

    // টেলিগ্রাম হালকা ভাইব্রেশন
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    // ০.৫৫ সেকেন্ড পর আবার স্বাভাবিক অবস্থায় ফিরবে
    setTimeout(() => setShakingTree(null), 550);
  };

  // Telegram SDK Init
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.expand();
      tg.ready();
    }
  }, []);

  // Energy Auto-Regeneration (প্রতি ২ সেকেন্ডে +১)
  useEffect(() => {
    const timer = setInterval(() => {
      setEnergy((prev) => (prev < maxEnergy ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio Synthesizer
  const playCoinSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.log(e);
    }
  };

  const showAlert = (message, type = 'warn', title = '') => {
    setAlertData({
      show: true,
      message,
      type,
      title: title || (type === 'success' ? 'সফল!' : 'সতর্কতা!')
    });
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred(type === 'success' ? 'success' : 'warning');
    }
  };

  // Main Coin Tap Action
  const handleMainTap = (event) => {
    if (energy <= 0) {
      showAlert("আপনার এনার্জি শেষ! কিছুক্ষণ অপেক্ষা করুন।", "warn", "এনার্জি শেষ ⚡");
      return;
    }

    playCoinSound();

    // Trigger flag flutter
    setFlagTapAnim(true);
    setTimeout(() => setFlagTapAnim(false), 1000);

    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

    // Floating text create
    const id = Date.now() + Math.random();
    const x = event.clientX || window.innerWidth / 2;
    const y = event.clientY || window.innerHeight / 2;
    setFloatingTexts((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 800);

    setTaka((prev) => prev + takaPerTap);
    setEnergy((prev) => prev - 1);
  };

  // Withdraw Submission
  const submitWithdraw = () => {
    const parsedAmount = parseFloat(amount);
    if (!phone || phone.length !== 11) {
      showAlert("সঠিক ১১ ডিজিটের ফোন নম্বর দিন!", "warn");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount < 50) {
      showAlert("সর্বনিম্ন উইথড্র ৳৫০ টাকা!", "warn");
      return;
    }
    if (parsedAmount > taka) {
      showAlert("পর্যাপ্ত ব্যালেন্স নেই!", "error");
      return;
    }

    setTaka((prev) => prev - parsedAmount);
    setIsWithdrawOpen(false);
    setAmount('');
    setPhone('');
    showAlert(`৳${parsedAmount} টাকা ${withdrawMethod}-এ সফলভাবে পাঠানো হয়েছে!`, "success", "উত্তোলন সফল 🎉");
  };

  return (
    <div className="h-screen w-screen flex justify-center items-center overflow-hidden">
      {/* Floating Taka Texts */}
      {floatingTexts.map((pop) => (
        <div
          key={pop.id}
          className="floating-taka text-lg font-black"
          style={{ left: `${pop.x - 25}px`, top: `${pop.y - 35}px` }}
        >
          +৳{takaPerTap.toFixed(2)}
        </div>
      ))}

      {/* Main Container */}
      <div
        className={`relative w-full max-w-md h-full flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-700 ${
          isNightMode
            ? 'bg-gradient-to-b from-[#070d19] via-[#0f172a] via-85% to-[#0f2d1e]'
            : 'bg-gradient-to-b from-[#38bdf8] via-[#60a5fa] to-[#93c5fd]'
        }`}
      >
        {/* ================= ১. প্রাকৃতিক সিনারি (SVG Vector Layers) ================= */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* সূর্য (Day) */}
          {!isNightMode && (
            <div>
              <div className="absolute top-10 right-8 w-24 h-24 rounded-full bg-amber-200/40 blur-xl"></div>
              <div className="absolute top-12 right-10 w-20 h-20 rounded-full bg-yellow-300 border-4 border-yellow-200/80 shadow-[0_0_40px_rgba(253,224,71,0.9)]"></div>
            </div>
          )}

          {/* চাঁদ (Night) */}
          {isNightMode && (
            <div className="absolute top-12 right-10 flex items-center justify-center">
              <div className="absolute w-24 h-24 rounded-full bg-indigo-300/25 blur-xl"></div>
              <svg className="w-16 h-16 drop-shadow-[0_0_20px_rgba(224,231,255,0.9)]" viewBox="0 0 100 100">
                <path d="M75 15 A 40 40 0 1 0 75 85 A 32 32 0 0 1 75 15 Z" fill="#fef08a" />
                <circle cx="45" cy="50" r="4" fill="#fde047" opacity="0.35" />
                <circle cx="35" cy="40" r="3" fill="#fde047" opacity="0.3" />
                <circle cx="40" cy="62" r="5" fill="#fde047" opacity="0.35" />
              </svg>
            </div>
          )}

          {/* রাতের তারা */}
          {isNightMode && (
            <div className="absolute inset-0 pointer-events-none z-0">
              <div className="star-twinkle absolute top-8 left-12 w-1.5 h-1.5 bg-white rounded-full"></div>
              <div className="star-twinkle star-delay-1 absolute top-14 left-36 w-1 h-1 bg-yellow-100 rounded-full"></div>
              <div className="star-twinkle star-delay-2 absolute top-20 left-60 w-2 h-2 bg-blue-100 rounded-full"></div>
              <div className="star-twinkle star-delay-1 absolute top-28 left-20 w-1.5 h-1.5 bg-white rounded-full"></div>
              <div className="star-twinkle absolute top-10 right-36 w-1 h-1 bg-white rounded-full"></div>
              <div className="star-twinkle star-delay-2 absolute top-32 right-16 w-2 h-2 bg-yellow-200 rounded-full"></div>
            </div>
          )}

          {/* মেঘমালা */}
          <div className="cloud-slow absolute top-16 left-0 opacity-80">
            <svg width="90" height="40" viewBox="0 0 100 45" fill="white">
              <path d="M10 35 Q 20 15, 40 20 Q 55 5, 75 18 Q 95 20, 90 35 Z" />
            </svg>
          </div>
          <div className="cloud-fast absolute top-28 left-0 opacity-90">
            <svg width="120" height="50" viewBox="0 0 100 45" fill="white">
              <path d="M10 35 Q 20 10, 45 15 Q 60 5, 80 18 Q 95 22, 90 35 Z" />
            </svg>
          </div>

          {/* পাহাড় */}
          <svg className="absolute bottom-40 w-full" viewBox="0 0 500 200" fill="none" preserveAspectRatio="none">
            <polygon points="0,170 80,70 180,170" fill={isNightMode ? '#0f172a' : '#334155'} opacity="0.9" />
            <polygon points="120,170 230,50 340,170" fill={isNightMode ? '#070d19' : '#1e293b'} opacity="0.8" />
            <polygon points="280,170 380,80 480,170" fill={isNightMode ? '#1e293b' : '#475569'} opacity="0.85" />
          </svg>

          {/* নদী বা লেক */}
          <svg className="absolute bottom-32 w-full h-24" viewBox="0 0 500 100" preserveAspectRatio="none">
            <path d="M0,40 Q 200,90 500,20 L 500,100 L 0,100 Z" fill={isNightMode ? '#1e3a8a' : '#38bdf8'} opacity={isNightMode ? 0.7 : 1} />
          </svg>

          {/* উইন্ডমিল */}
          <div className="absolute bottom-48 right-16 flex flex-col items-center">
            <svg className="windmill-blade w-20 h-20 text-white" viewBox="0 0 100 100">
              <line x1="50" y1="50" x2="50" y2="10" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <line x1="50" y1="50" x2="85" y2="70" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <line x1="50" y1="50" x2="15" y2="70" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <circle cx="50" cy="50" r="4" fill="#64748b" />
            </svg>
            <div className="w-1.5 h-16 bg-white shadow-sm -mt-10"></div>
          </div>

          {/* সবুজ ভূমি */}
          <div
            className={`absolute bottom-0 w-full h-64 rounded-t-[50px] border-t-4 transition-all duration-700 ${
              isNightMode
                ? 'bg-gradient-to-t from-[#062313] to-[#0d381e] border-[#14532d]'
                : 'bg-gradient-to-t from-[#2e7d32] to-[#4caf50] border-[#81c784]'
            }`}
          ></div>

          {/* ================= সম্পূর্ণ ভেক্টর ঘাসের মাঠ ও ফুল ================= */}
          <div className="absolute inset-x-0 bottom-0 h-44 pointer-events-none z-10 select-none overflow-hidden">
            <svg viewBox="0 0 450 180" className="w-full h-full drop-shadow-md" preserveAspectRatio="none" fill="none">
              <defs>
                <linearGradient id="grassBladeGrad1" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#14532d" />
                  <stop offset="40%" stopColor="#16a34a" />
                  <stop offset="100%" stopColor="#4ade80" />
                </linearGradient>

                <linearGradient id="grassBladeGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#0f3d1e" />
                  <stop offset="50%" stopColor="#15803d" />
                  <stop offset="100%" stopColor="#86efac" />
                </linearGradient>

                <linearGradient id="moundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="35%" stopColor="#16a34a" />
                  <stop offset="100%" stopColor="#14532d" />
                </linearGradient>

                <radialGradient id="flowerWhite" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="70%" stopColor="#f8fafc" />
                  <stop offset="100%" stopColor="#cbd5e1" />
                </radialGradient>
              </defs>

              {/* ব্যাকগ্রাউন্ড ঘাসের টিলা */}
              <path d="M-20,70 Q 60,35 140,65 Q 220,95 300,50 Q 380,25 470,60 L 470,180 L -20,180 Z" fill="url(#moundGrad)" opacity="0.95" />
              <path d="M-20,95 Q 80,65 180,90 Q 280,115 370,80 Q 420,65 470,85 L 470,180 L -20,180 Z" fill="#14532d" />

              {/* গাছের গোড়ার ঘাসের গুচ্ছ */}
              <g transform="translate(15, 45)">
                <path d="M10,40 C 5,20 0,5 -2,-5 C 5,10 12,25 15,40 Z" fill="url(#grassBladeGrad1)" />
                <path d="M15,40 C 20,18 22,0 26,-8 C 28,12 28,28 25,40 Z" fill="url(#grassBladeGrad2)" />
                <path d="M22,40 C 28,24 38,10 46,2 C 40,18 35,30 30,40 Z" fill="url(#grassBladeGrad1)" />
                <path d="M5,40 C -2,25 -5,12 -8,5 C 0,16 5,28 10,40 Z" fill="#15803d" />
              </g>

              <g transform="translate(110, 48)">
                <path d="M12,38 C 8,20 2,2 0,-8 C 7,8 14,24 18,38 Z" fill="url(#grassBladeGrad2)" />
                <path d="M18,38 C 24,16 28,-2 32,-10 C 34,10 32,26 28,38 Z" fill="url(#grassBladeGrad1)" />
                <path d="M25,38 C 32,22 42,8 50,0 C 44,16 38,28 34,38 Z" fill="url(#grassBladeGrad2)" />
              </g>

              <g transform="translate(200, 52)">
                <path d="M15,42 C 8,22 4,5 0,-6 C 8,10 16,26 20,42 Z" fill="url(#grassBladeGrad1)" />
                <path d="M20,42 C 26,18 32,0 38,-8 C 39,12 36,28 30,42 Z" fill="url(#grassBladeGrad2)" />
                <path d="M28,42 C 36,25 46,12 55,5 C 48,20 40,32 35,42 Z" fill="url(#grassBladeGrad1)" />
                <circle cx="28" cy="8" r="4.5" fill="#4ade80" />
                <circle cx="34" cy="8" r="4.5" fill="#22c55e" />
                <circle cx="31" cy="4" r="4.5" fill="#86efac" />
              </g>

              <g transform="translate(285, 45)">
                <path d="M10,40 C 4,20 -2,4 -5,-6 C 4,10 12,25 16,40 Z" fill="url(#grassBladeGrad1)" />
                <path d="M16,40 C 22,18 25,0 30,-8 C 31,12 29,27 24,40 Z" fill="url(#grassBladeGrad2)" />
                <path d="M22,40 C 30,22 40,8 48,0 C 42,16 35,28 30,40 Z" fill="url(#grassBladeGrad1)" />
              </g>

              <g transform="translate(375, 40)">
                <path d="M12,42 C 6,22 2,5 -2,-5 C 6,10 14,26 18,42 Z" fill="url(#grassBladeGrad2)" />
                <path d="M18,42 C 25,18 30,-2 35,-10 C 36,12 33,28 28,42 Z" fill="url(#grassBladeGrad1)" />
                <path d="M26,42 C 34,24 45,10 54,2 C 46,18 38,30 32,42 Z" fill="url(#grassBladeGrad2)" />
              </g>

              {/* সামনের ঘন ঘাসের কার্পেট */}
              <g transform="translate(-10, 85)">
                <path d="M20,60 C 12,30 5,8 0,-8 C 10,15 18,35 25,60 Z" fill="url(#grassBladeGrad1)" />
                <path d="M25,60 C 32,28 38,2 45,-12 C 46,18 42,40 35,60 Z" fill="url(#grassBladeGrad2)" />
                <path d="M32,60 C 42,32 55,12 68,0 C 58,22 48,42 42,60 Z" fill="url(#grassBladeGrad1)" />

                <path d="M75,60 C 68,32 60,10 55,-5 C 65,15 72,35 80,60 Z" fill="url(#grassBladeGrad2)" />
                <path d="M80,60 C 88,28 95,0 102,-12 C 104,18 98,40 90,60 Z" fill="url(#grassBladeGrad1)" />
                <path d="M88,60 C 98,34 112,15 125,2 C 114,24 102,44 96,60 Z" fill="url(#grassBladeGrad2)" />

                <path d="M140,60 C 132,30 125,8 118,-6 C 128,15 135,35 145,60 Z" fill="url(#grassBladeGrad1)" />
                <path d="M145,60 C 154,26 160,0 168,-14 C 168,18 162,40 155,60 Z" fill="url(#grassBladeGrad2)" />
                <path d="M152,60 C 164,32 178,12 192,-2 C 180,22 168,42 160,60 Z" fill="url(#grassBladeGrad1)" />

                <path d="M210,60 C 202,32 195,10 188,-5 C 198,15 205,35 215,60 Z" fill="url(#grassBladeGrad2)" />
                <path d="M215,60 C 224,28 230,2 238,-10 C 238,18 232,40 225,60 Z" fill="url(#grassBladeGrad1)" />
                <path d="M222,60 C 232,34 246,16 260,2 C 248,24 236,44 230,60 Z" fill="url(#grassBladeGrad2)" />

                <path d="M280,60 C 272,30 265,8 258,-6 C 268,15 275,35 285,60 Z" fill="url(#grassBladeGrad1)" />
                <path d="M285,60 C 294,26 300,0 308,-14 C 308,18 302,40 295,60 Z" fill="url(#grassBladeGrad2)" />
                <path d="M292,60 C 304,32 318,12 332,-2 C 320,22 308,42 300,60 Z" fill="url(#grassBladeGrad1)" />

                <path d="M350,60 C 342,32 335,10 328,-5 C 338,15 345,35 355,60 Z" fill="url(#grassBladeGrad2)" />
                <path d="M355,60 C 364,28 370,2 378,-10 C 378,18 372,40 365,60 Z" fill="url(#grassBladeGrad1)" />
                <path d="M362,60 C 372,34 386,16 400,2 C 388,24 376,44 370,60 Z" fill="url(#grassBladeGrad2)" />

                <path d="M410,60 C 402,30 395,8 390,-6 C 400,15 408,35 418,60 Z" fill="url(#grassBladeGrad1)" />
                <path d="M418,60 C 428,26 435,0 442,-12 C 442,18 436,40 430,60 Z" fill="url(#grassBladeGrad2)" />
                <path d="M425,60 C 438,32 452,12 465,0 C 454,22 442,42 435,60 Z" fill="url(#grassBladeGrad1)" />
              </g>

              {/* ফুলসমূহ */}
              <g transform="translate(60, 100)">
                <circle cx="0" cy="-4" r="3" fill="url(#flowerWhite)" />
                <circle cx="4" cy="0" r="3" fill="url(#flowerWhite)" />
                <circle cx="0" cy="4" r="3" fill="url(#flowerWhite)" />
                <circle cx="-4" cy="0" r="3" fill="url(#flowerWhite)" />
                <circle cx="0" cy="0" r="2.5" fill="#facc15" />
              </g>

              <g transform="translate(170, 115) scale(0.85)">
                <circle cx="0" cy="-4" r="3" fill="url(#flowerWhite)" />
                <circle cx="4" cy="0" r="3" fill="url(#flowerWhite)" />
                <circle cx="0" cy="4" r="3" fill="url(#flowerWhite)" />
                <circle cx="-4" cy="0" r="3" fill="url(#flowerWhite)" />
                <circle cx="0" cy="0" r="2.5" fill="#f59e0b" />
              </g>

              <g transform="translate(260, 98) scale(1.1)">
                <circle cx="0" cy="-4" r="3" fill="url(#flowerWhite)" />
                <circle cx="4" cy="0" r="3" fill="url(#flowerWhite)" />
                <circle cx="0" cy="4" r="3" fill="url(#flowerWhite)" />
                <circle cx="-4" cy="0" r="3" fill="url(#flowerWhite)" />
                <circle cx="0" cy="0" r="2.5" fill="#facc15" />
              </g>

              <g transform="translate(390, 110) scale(0.9)">
                <circle cx="0" cy="-4" r="3" fill="url(#flowerWhite)" />
                <circle cx="4" cy="0" r="3" fill="url(#flowerWhite)" />
                <circle cx="0" cy="4" r="3" fill="url(#flowerWhite)" />
                <circle cx="-4" cy="0" r="3" fill="url(#flowerWhite)" />
                <circle cx="0" cy="0" r="2.5" fill="#fbbf24" />
              </g>
            </svg>
          </div>
        </div>

        {/* ================= ২. টপ ইনফো বার ================= */}
        <header className="relative z-20 flex justify-between items-center p-4 pt-5">
          <button
            onClick={() => setIsNightMode(!isNightMode)}
            className="flex items-center gap-1.5 bg-sky-500/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-sky-300 shadow-md text-white font-bold text-xs transition active:scale-95 cursor-pointer"
          >
            <span>{isNightMode ? '🌙' : '☀️'}</span>
            <span>{isNightMode ? 'রাত' : 'দিন'}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-400/40 shadow-lg">
            <span className="text-amber-300 text-lg font-black">৳</span>
            <span className="text-white font-extrabold text-base font-['Outfit']">{taka.toFixed(2)}</span>
          </div>
        </header>

        {/* ================= ৩. সেন্ট্রাল আর্কেড ট্যাপার ও গাছপালা ================= */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center -mt-6">
          <div className="relative flex flex-col items-center justify-center cursor-pointer select-none" onClick={handleMainTap}>
            {/* ক্রসড দুটি জাতীয় পতাকা */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <svg viewBox="0 0 340 340" className="w-[305px] h-[305px] overflow-visible drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                <defs>
                  <radialGradient id="flagGoldBallGrad" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="40%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#854d0e" />
                  </radialGradient>
                  <linearGradient id="flagPoleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#cbd5e1" />
                    <stop offset="35%" stopColor="#ffffff" />
                    <stop offset="70%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>

                  <clipPath id="bdLeftWaveClip">
                    <path d="M 168,16 Q 150,23 134,16 Q 116,9 98,18 L 98,60 Q 116,51 134,58 Q 150,65 168,58 Z">
                      <animate
                        attributeName="d"
                        dur="1.4s"
                        repeatCount="indefinite"
                        values="M 168,16 Q 150,24 134,16 Q 116,8 98,19 L 98,61 Q 116,50 134,58 Q 150,66 168,58 Z;
                                M 168,16 Q 150,10 134,21 Q 116,27 98,13 L 98,55 Q 116,69 134,63 Q 150,52 168,58 Z;
                                M 168,16 Q 150,24 134,16 Q 116,8 98,19 L 98,61 Q 116,50 134,58 Q 150,66 168,58 Z"
                      />
                    </path>
                  </clipPath>

                  <clipPath id="bdRightWaveClip">
                    <path d="M 172,16 Q 190,23 206,16 Q 224,9 242,18 L 242,60 Q 224,51 206,58 Q 190,65 172,58 Z">
                      <animate
                        attributeName="d"
                        dur="1.4s"
                        repeatCount="indefinite"
                        values="M 172,16 Q 190,24 206,16 Q 224,8 242,19 L 242,61 Q 224,50 206,58 Q 190,66 172,58 Z;
                                M 172,16 Q 190,10 206,21 Q 224,27 242,13 L 242,55 Q 224,69 206,63 Q 190,52 172,58 Z;
                                M 172,16 Q 190,24 206,16 Q 224,8 242,19 L 242,61 Q 224,50 206,58 Q 190,66 172,58 Z"
                      />
                    </path>
                  </clipPath>
                </defs>

                {/* বাম পতাকা */}
                <g transform="rotate(-38, 170, 170)">
                  <rect x="168" y="10" width="4" height="300" rx="2" fill="url(#flagPoleGrad)" />
                  <circle cx="170" cy="10" r="6.5" fill="url(#flagGoldBallGrad)" />
                  <g className={`bd-flag-wave-left ${flagTapAnim ? 'flag-tap-fast-left' : ''}`}>
                    <g clipPath="url(#bdLeftWaveClip)">
                      <rect x="90" y="6" width="85" height="64" fill="#006a4e" />
                      <circle cx="130" cy="37" r="13" fill="#f42a41" />
                    </g>
                  </g>
                </g>

                {/* ডান পতাকা */}
                <g transform="rotate(38, 170, 170)">
                  <rect x="168" y="10" width="4" height="300" rx="2" fill="url(#flagPoleGrad)" />
                  <circle cx="170" cy="10" r="6.5" fill="url(#flagGoldBallGrad)" />
                  <g className={`bd-flag-wave-right ${flagTapAnim ? 'flag-tap-fast-right' : ''}`}>
                    <g clipPath="url(#bdRightWaveClip)">
                      <rect x="168" y="6" width="85" height="64" fill="#006a4e" />
                      <circle cx="202" cy="37" r="13" fill="#f42a41" />
                    </g>
                  </g>
                </g>
              </svg>
            </div>

            {/* সেন্ট্রাল গোল্ডেন কয়েন */}
            <div className="relative z-10 w-48 h-48 rounded-full p-2.5 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-[0_12px_40px_rgba(245,158,11,0.5),inset_0_2px_6px_rgba(255,255,255,0.9)] flex items-center justify-center transition-transform duration-75 active:scale-90">
              <div className="w-full h-full rounded-full bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 border-4 border-amber-100 flex flex-col items-center justify-center shadow-[inset_0_5px_15px_rgba(255,255,255,0.75),inset_0_-5px_10px_rgba(180,83,9,0.55)] relative overflow-hidden">
                <div className="absolute -top-7 left-3 w-36 h-24 bg-white/45 rounded-full rotate-[-25deg] blur-[2px] pointer-events-none"></div>
                <div className="flex flex-col items-center justify-center drop-shadow-[0_2px_4px_rgba(120,53,15,0.7)] z-10">
                  <span className="text-amber-950 font-black text-6xl leading-none">৳</span>
                  <span className="text-amber-900 font-extrabold text-[11px] tracking-wider uppercase mt-1 bg-amber-200/80 px-3 py-0.5 rounded-full border border-amber-300">
                    ট্যাপ করুন
                  </span>
                </div>
              </div>
            </div>

            {/* এনার্জি স্ট্যাটাস বার */}
            <div className="mt-4 flex items-center gap-1.5 bg-slate-900/75 backdrop-blur-md px-4 py-1.5 rounded-full border border-amber-400/30 shadow-md z-10">
              <span className="text-amber-400 text-sm">⚡</span>
              <span className="text-white text-xs font-bold font-['Outfit']">
                {energy} / {maxEnergy}
              </span>
            </div>
          </div>

          {/* ================= ৪টি ইন্টারেক্টিভ শেকিং গাছ ================= */}
          <div className="absolute inset-x-0 bottom-3 px-2 sm:px-4 flex items-end justify-between pointer-events-none z-0 select-none">
            
            {/* Tree 1 - বাম পাশের পেছনের গাছ */}
            <div 
              onClick={(e) => handleTreeClick(1, e)}
              className={`relative w-24 h-48 sm:w-28 sm:h-52 opacity-90 -mb-1 pointer-events-auto cursor-pointer transition-transform duration-100 ${
                shakingTree === 1 ? 'tree-shake' : ''
              }`}
            >
              <svg viewBox="0 0 140 220" className="w-full h-full drop-shadow-md" fill="none">
                <ellipse cx="70" cy="210" rx="35" ry="7" fill="#0f3d1e" opacity="0.3" />
                <path d="M63 160 L77 160 L80 210 L60 210 Z" fill="#4e342e" />
                <polygon points="70,105 18,172 70,172" fill="#16a34a" />
                <polygon points="70,105 70,172 122,172" fill="#14532d" />
                <polygon points="70,60 30,125 70,125" fill="#22c55e" />
                <polygon points="70,60 70,125 110,125" fill="#16a34a" />
                <polygon points="70,20 42,78 70,78" fill="#4ade80" />
                <polygon points="70,20 70,78 98,78" fill="#22c55e" />
              </svg>
            </div>

            {/* Tree 2 - বাম পাশের বড় গাছ */}
            <div 
              onClick={(e) => handleTreeClick(2, e)}
              className={`relative w-32 h-64 sm:w-36 sm:h-72 -ml-3 z-10 pointer-events-auto cursor-pointer transition-transform duration-100 ${
                shakingTree === 2 ? 'tree-shake' : ''
              }`}
            >
              <svg viewBox="0 0 160 260" className="w-full h-full drop-shadow-xl" fill="none">
                <ellipse cx="80" cy="250" rx="45" ry="9" fill="#062814" opacity="0.45" />
                <path d="M71 180 L89 180 L93 250 L67 250 Z" fill="#5c3826" />
                <path d="M80 180 L89 180 L93 250 L80 250 Z" fill="#3e2415" opacity="0.45" />
                <polygon points="80,125 10,195 80,195" fill="#16a34a" />
                <polygon points="80,125 80,195 150,195" fill="#14532d" />
                <polygon points="80,125 10,195 24,195" fill="#86efac" opacity="0.35" />
                <polygon points="80,80 24,142 80,142" fill="#22c55e" />
                <polygon points="80,80 80,142 136,142" fill="#15803d" />
                <polygon points="80,80 24,142 38,142" fill="#86efac" opacity="0.35" />
                <polygon points="80,40 38,96 80,96" fill="#4ade80" />
                <polygon points="80,40 80,96 122,96" fill="#16a34a" />
                <polygon points="80,5 50,52 80,52" fill="#86efac" />
                <polygon points="80,5 80,52 110,52" fill="#22c55e" />
              </svg>
            </div>

            {/* Tree 3 - ডান পাশের ভেতরের গাছ */}
            <div 
              onClick={(e) => handleTreeClick(3, e)}
              className={`relative w-28 h-56 sm:w-32 sm:h-60 -mr-3 z-10 pointer-events-auto cursor-pointer transition-transform duration-100 ${
                shakingTree === 3 ? 'tree-shake' : ''
              }`}
            >
              <svg viewBox="0 0 150 240" className="w-full h-full drop-shadow-lg" fill="none">
                <ellipse cx="75" cy="232" rx="40" ry="8" fill="#062814" opacity="0.4" />
                <path d="M67 170 L83 170 L87 232 L63 232 Z" fill="#5c3826" />
                <polygon points="75,112 15,182 75,182" fill="#16a34a" />
                <polygon points="75,112 75,182 135,182" fill="#14532d" />
                <polygon points="75,112 15,182 28,182" fill="#86efac" opacity="0.3" />
                <polygon points="75,65 28,128 75,128" fill="#22c55e" />
                <polygon points="75,65 75,128 122,128" fill="#15803d" />
                <polygon points="75,20 42,78 75,78" fill="#4ade80" />
                <polygon points="75,20 75,78 108,78" fill="#22c55e" />
              </svg>
            </div>

            {/* Tree 4 - ডান পাশের বাইরের বড় গাছ */}
            <div 
              onClick={(e) => handleTreeClick(4, e)}
              className={`relative w-32 h-64 sm:w-36 sm:h-72 -mr-1 z-0 pointer-events-auto cursor-pointer transition-transform duration-100 ${
                shakingTree === 4 ? 'tree-shake' : ''
              }`}
            >
              <svg viewBox="0 0 160 260" className="w-full h-full drop-shadow-xl" fill="none">
                <ellipse cx="80" cy="250" rx="45" ry="9" fill="#062814" opacity="0.45" />
                <path d="M71 180 L89 180 L93 250 L67 250 Z" fill="#5c3826" />
                <path d="M80 180 L89 180 L93 250 L80 250 Z" fill="#3e2415" opacity="0.45" />
                <polygon points="80,125 10,195 80,195" fill="#16a34a" />
                <polygon points="80,125 80,195 150,195" fill="#14532d" />
                <polygon points="80,125 10,195 24,195" fill="#86efac" opacity="0.35" />
                <polygon points="80,80 24,142 80,142" fill="#22c55e" />
                <polygon points="80,80 80,142 136,142" fill="#15803d" />
                <polygon points="80,80 24,142 38,142" fill="#86efac" opacity="0.35" />
                <polygon points="80,40 38,96 80,96" fill="#4ade80" />
                <polygon points="80,40 80,96 122,96" fill="#16a34a" />
                <polygon points="80,5 50,52 80,52" fill="#86efac" />
                <polygon points="80,5 80,52 110,52" fill="#22c55e" />
              </svg>
            </div>

          </div>
        </main>

        {/* ================= ৪. উডেন প্লাঙ্ক ও লতাপাতা ন্যাভিগেশন বার ================= */}
        <footer className="relative z-30 px-3 pb-3 pt-0 select-none">
          <div className="relative w-full flex items-center justify-center">
            
            {/* ভেক্টর উডেন ফ্রেম ও লতাপাতা (SVG Background) */}
            <div className="absolute inset-0 pointer-events-none -my-2 -mx-1">
              <svg viewBox="0 0 400 95" className="w-full h-full drop-shadow-[0_12px_20px_rgba(0,0,0,0.65)]" preserveAspectRatio="none">
                <defs>
                  {/* কাঠের গ্রেডিয়েন্টসমূহ */}
                  <linearGradient id="plankGradTop" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#965624" />
                    <stop offset="20%" stopColor="#804419" />
                    <stop offset="80%" stopColor="#5e300f" />
                    <stop offset="100%" stopColor="#3d1e08" />
                  </linearGradient>
                  <linearGradient id="plankGradMid" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a7612c" />
                    <stop offset="25%" stopColor="#8d4a1b" />
                    <stop offset="85%" stopColor="#63320e" />
                    <stop offset="100%" stopColor="#442108" />
                  </linearGradient>
                  <linearGradient id="plankGradBot" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8d4a1b" />
                    <stop offset="30%" stopColor="#753912" />
                    <stop offset="85%" stopColor="#522609" />
                    <stop offset="100%" stopColor="#2c1404" />
                  </linearGradient>

                  {/* পাতার রিয়েলিস্টিক গ্রেডিয়েন্ট */}
                  <linearGradient id="leafGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#86efac" />
                    <stop offset="50%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#15803d" />
                  </linearGradient>
                  <linearGradient id="leafGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="60%" stopColor="#16a34a" />
                    <stop offset="100%" stopColor="#14532d" />
                  </linearGradient>
                </defs>

                {/* ১. পেছনের তক্তা ৩টি (Stacked Wooden Planks) */}
                {/* উপরের তক্তা */}
                <path d="M 16,8 Q 200,6 384,7 L 388,34 Q 200,36 12,34 Z" fill="url(#plankGradTop)" stroke="#2b1406" strokeWidth="1.5" />
                <line x1="28" y1="20" x2="370" y2="20" stroke="#3b1d09" strokeWidth="1" opacity="0.4" strokeDasharray="30 15 60 10" />

                {/* মাঝের তক্তা */}
                <path d="M 12,33 Q 200,35 388,33 L 390,62 Q 200,64 10,63 Z" fill="url(#plankGradMid)" stroke="#2b1406" strokeWidth="1.5" />
                <line x1="24" y1="48" x2="375" y2="48" stroke="#3b1d09" strokeWidth="1.2" opacity="0.4" strokeDasharray="50 20 40 15" />

                {/* নিচের তক্তা */}
                <path d="M 10,62 Q 200,63 390,62 L 386,88 Q 200,89 14,88 Z" fill="url(#plankGradBot)" stroke="#210f04" strokeWidth="1.5" />

                {/* কাঠের পেরেক (Nails) */}
                <circle cx="22" cy="20" r="2" fill="#2d190b" stroke="#63391b" strokeWidth="0.8" />
                <circle cx="378" cy="20" r="2" fill="#2d190b" stroke="#63391b" strokeWidth="0.8" />
                <circle cx="20" cy="76" r="2" fill="#2d190b" stroke="#63391b" strokeWidth="0.8" />
                <circle cx="380" cy="76" r="2" fill="#2d190b" stroke="#63391b" strokeWidth="0.8" />

                {/* ২. লতানো ডালপালা (Creeping Jungle Vine) */}
                <path d="M 5,26 Q 50,14 110,22 Q 170,30 230,16 Q 300,6 365,22 Q 380,26 395,20" fill="none" stroke="#3e2311" strokeWidth="5" strokeLinecap="round" />
                <path d="M 5,26 Q 50,14 110,22 Q 170,30 230,16 Q 300,6 365,22 Q 380,26 395,20" fill="none" stroke="#5c381c" strokeWidth="3" strokeLinecap="round" />

                {/* ৩. বাম পাশের বড় পাতার গুচ্ছ (Left Leaf Cluster) */}
                <g transform="translate(-8, -6)">
                  <path d="M 35,28 C 15,10 5,28 14,48 C 22,58 42,48 35,28 Z" fill="url(#leafGradDark)" />
                  <path d="M 46,38 C 28,15 15,35 26,58 C 36,68 56,52 46,38 Z" fill="url(#leafGradLight)" />
                  <path d="M 22,46 C 4,35 -2,52 6,68 C 14,78 30,68 22,46 Z" fill="url(#leafGradDark)" />
                  <path d="M 40,16 C 24,0 12,14 22,30 C 30,42 48,30 40,16 Z" fill="url(#leafGradLight)" />
                </g>

                {/* ৪. মাঝের শীর্ষ পাতার গুচ্ছ (Top Center Leaves) */}
                <g transform="translate(170, -4)">
                  <path d="M 28,18 C 18,2 2,12 12,25 C 20,32 34,26 28,18 Z" fill="url(#leafGradDark)" />
                  <path d="M 36,20 C 46,2 62,10 52,24 C 44,32 30,28 36,20 Z" fill="url(#leafGradLight)" />
                  <path d="M 32,15 C 32,-3 42,-3 42,15 C 42,24 32,24 32,15 Z" fill="#86efac" />
                </g>

                {/* ৫. ডান পাশের পাতার গুচ্ছ (Right Leaf Cluster) */}
                <g transform="translate(355, 45)">
                  <path d="M 12,10 C 26,-4 40,6 32,22 C 24,30 10,22 12,10 Z" fill="url(#leafGradLight)" />
                  <path d="M 18,24 C 34,16 44,30 32,44 C 22,50 12,38 18,24 Z" fill="url(#leafGradDark)" />
                  <path d="M 5,26 C 16,36 12,50 -2,46 C -10,40 -4,26 5,26 Z" fill="url(#leafGradLight)" />
                </g>
              </svg>
            </div>

            {/* ফ্রন্ট মেনু বাটনসমূহ (UI Icons & Text) */}
            <div className="relative z-10 w-full py-2.5 px-6 flex justify-around items-center">
              
              {/* ফার্ম বাটন (এক্টিভ - স্ক্রিনশটের মতো গ্রিন কার্ভড ব্যাকগ্রাউন্ড) */}
              <button className="flex flex-col items-center justify-center gap-0.5 bg-[#bbf7d0]/90 border border-emerald-400/80 shadow-[0_4px_10px_rgba(0,0,0,0.35),inset_0_2px_4px_rgba(255,255,255,0.8)] px-5 py-1.5 rounded-2xl active:scale-95 transition">
                <svg className="w-5 h-5 text-emerald-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="text-[11px] text-emerald-950 font-black tracking-tight">খামার</span>
              </button>

              {/* কাজ বাটন (ইন-এক্টিভ গ্লাস কার্ড) */}
              <button 
                onClick={() => showAlert('টেলিগ্রাম টাস্ক সিস্টেম শীঘ্রই চালু হচ্ছে!', 'info', 'টাস্ক সেন্টার 🚀')}
                className="flex flex-col items-center justify-center gap-0.5 bg-black/25 hover:bg-black/35 border border-amber-200/20 px-4 py-1.5 rounded-2xl text-amber-100/90 active:scale-95 transition backdrop-blur-[2px]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="text-[11px] font-extrabold text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">কাজ</span>
              </button>

              {/* উইথড্র বাটন (ইন-এক্টিভ গ্লাস কার্ড) */}
              <button 
                onClick={() => setIsWithdrawOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 bg-black/25 hover:bg-black/35 border border-amber-200/20 px-4 py-1.5 rounded-2xl text-amber-100/90 active:scale-95 transition backdrop-blur-[2px]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="text-[11px] font-extrabold text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">উইথড্র</span>
              </button>

            </div>
          </div>
        </footer>

        {/* ================= ফরেস্ট উডেন অ্যালার্ট মডাল ================= */}
        {alertData.show && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none">
            <div className="relative w-full max-w-xs modal-pop-animate p-5 text-center text-white">
              
              {/* কাঠের ব্যাকগ্রাউন্ড ও লতাপাতা */}
              <div className="absolute inset-0 pointer-events-none -m-2">
                <svg viewBox="0 0 320 230" className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)]" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="alertWoodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8d4a1b" />
                      <stop offset="50%" stopColor="#5c2c0c" />
                      <stop offset="100%" stopColor="#2c1404" />
                    </linearGradient>
                    <linearGradient id="alertLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#86efac" />
                      <stop offset="60%" stopColor="#16a34a" />
                      <stop offset="100%" stopColor="#14532d" />
                    </linearGradient>
                  </defs>
                  <rect x="12" y="12" width="296" height="206" rx="22" fill="url(#alertWoodGrad)" stroke="#2b1406" strokeWidth="3" />
                  <rect x="16" y="16" width="288" height="198" rx="18" fill="none" stroke="#a7612c" strokeWidth="1" opacity="0.35" />
                  
                  {/* লতাপাতা (শীর্ষ ও কোণা) */}
                  <path d="M 28,16 C 10,-4 0,16 10,34 C 20,44 40,32 28,16 Z" fill="url(#alertLeafGrad)" />
                  <path d="M 40,24 C 22,4 12,24 22,44 C 32,54 50,40 40,24 Z" fill="#4ade80" />
                  <path d="M 280,18 C 300,0 312,18 300,36 C 290,44 274,32 280,18 Z" fill="url(#alertLeafGrad)" />
                </svg>
              </div>

              {/* কন্টেন্ট */}
              <div className="relative z-10 py-1">
                <div className="w-12 h-12 mx-auto mb-2 rounded-2xl flex items-center justify-center text-2xl bg-black/40 border-2 border-amber-400/60 shadow-inner">
                  {alertData.type === 'success' ? '🎉' : '⚡'}
                </div>
                <h3 className="text-base font-black text-amber-200 mb-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {alertData.title}
                </h3>
                <p className="text-xs text-amber-100/90 mb-4">{alertData.message}</p>
                <button
                  onClick={() => setAlertData({ ...alertData, show: false })}
                  className="w-full py-2.5 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 active:scale-95 transition shadow-lg"
                >
                  ঠিক আছে
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ================= ফরেস্ট উডেন উইথড্র মডাল ================= */}
        {isWithdrawOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
            <div className="relative w-full max-w-sm modal-pop-animate p-6 text-white">
              
              {/* উডেন ফ্রেম ও পাতার SVG ব্যাকগ্রাউন্ড */}
              <div className="absolute inset-0 pointer-events-none -m-3">
                <svg viewBox="0 0 380 430" className="w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)]" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="modalWoodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8d4a1b" />
                      <stop offset="15%" stopColor="#753912" />
                      <stop offset="50%" stopColor="#5c2c0c" />
                      <stop offset="85%" stopColor="#441f07" />
                      <stop offset="100%" stopColor="#2c1404" />
                    </linearGradient>

                    <linearGradient id="leafGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#86efac" />
                      <stop offset="50%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#15803d" />
                    </linearGradient>

                    <linearGradient id="leafGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4ade80" />
                      <stop offset="60%" stopColor="#16a34a" />
                      <stop offset="100%" stopColor="#14532d" />
                    </linearGradient>
                  </defs>

                  {/* প্রধান কাঠের তক্তা ফ্রেম */}
                  <rect x="18" y="18" width="344" height="394" rx="28" fill="url(#modalWoodGrad)" stroke="#2b1406" strokeWidth="4" />
                  <rect x="24" y="24" width="332" height="382" rx="22" fill="none" stroke="#a7612c" strokeWidth="1.5" opacity="0.4" />

                  {/* কাঠের তক্তার আনুভূমিক খাঁজ ও পেরেক */}
                  <line x1="28" y1="90" x2="352" y2="90" stroke="#210f04" strokeWidth="2.5" opacity="0.6" />
                  <line x1="28" y1="210" x2="352" y2="210" stroke="#210f04" strokeWidth="2.5" opacity="0.6" />
                  <line x1="28" y1="330" x2="352" y2="330" stroke="#210f04" strokeWidth="2.5" opacity="0.6" />
                  
                  <circle cx="34" cy="34" r="3.5" fill="#1e0c03" stroke="#5c381c" strokeWidth="1" />
                  <circle cx="346" cy="34" r="3.5" fill="#1e0c03" stroke="#5c381c" strokeWidth="1" />
                  <circle cx="34" cy="396" r="3.5" fill="#1e0c03" stroke="#5c381c" strokeWidth="1" />
                  <circle cx="346" cy="396" r="3.5" fill="#1e0c03" stroke="#5c381c" strokeWidth="1" />

                  {/* উপরে লতানো ডালপালা */}
                  <path d="M 10,40 Q 90,8 190,24 Q 280,38 370,18" fill="none" stroke="#3e2311" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 10,40 Q 90,8 190,24 Q 280,38 370,18" fill="none" stroke="#5c381c" strokeWidth="3" strokeLinecap="round" />

                  {/* ১. বাম শীর্ষ পাতার গুচ্ছ (Top-Left Cluster) */}
                  <g transform="translate(0, -6)">
                    <path d="M 38,32 C 16,12 2,34 14,56 C 24,68 46,56 38,32 Z" fill="url(#leafGradDark)" />
                    <path d="M 52,42 C 30,16 16,40 28,66 C 40,78 62,60 52,42 Z" fill="url(#leafGradLight)" />
                    <path d="M 44,18 C 26,-2 10,14 22,34 C 32,48 52,34 44,18 Z" fill="url(#leafGradLight)" />
                  </g>

                  {/* ২. ডান শীর্ষ পাতার গুচ্ছ (Top-Right Cluster) */}
                  <g transform="translate(295, -8)">
                    <path d="M 42,22 C 60,4 78,22 66,42 C 54,54 36,44 42,22 Z" fill="url(#leafGradLight)" />
                    <path d="M 28,34 C 48,16 68,36 52,60 C 38,72 20,56 28,34 Z" fill="url(#leafGradDark)" />
                    <path d="M 64,18 C 76,2 90,14 82,30 C 74,40 60,32 64,18 Z" fill="#86efac" />
                  </g>

                  {/* ৩. ডান নিচের পাতার গুচ্ছ (Bottom-Right Cluster) */}
                  <g transform="translate(325, 340)">
                    <path d="M 16,14 C 36,-2 52,12 42,32 C 32,42 14,32 16,14 Z" fill="url(#leafGradLight)" />
                    <path d="M 24,32 C 44,22 58,40 42,58 C 28,68 14,52 24,32 Z" fill="url(#leafGradDark)" />
                    <path d="M 6,36 C 20,48 16,66 -2,62 C -12,54 -4,36 6,36 Z" fill="url(#leafGradLight)" />
                  </g>
                </svg>
              </div>

              {/* মডালের ভেতরের কন্টেন্ট */}
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4 border-b border-amber-900/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌿</span>
                    <h3 className="font-black text-base text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">উইথড্র ওয়ালেট</h3>
                  </div>
                  <button 
                    onClick={() => setIsWithdrawOpen(false)} 
                    className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 border border-amber-300/30 text-amber-200 text-sm font-black flex items-center justify-center transition active:scale-95"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-amber-200/90 font-bold block mb-1">পেমেন্ট মেথড:</label>
                    <select
                      value={withdrawMethod}
                      onChange={(e) => setWithdrawMethod(e.target.value)}
                      className="w-full bg-[#1b0e06]/85 border border-amber-600/40 rounded-xl p-2 text-sm text-emerald-300 outline-none shadow-inner"
                    >
                      <option value="bKash">🌸 bKash (বিকাশ)</option>
                      <option value="Nagad">🔥 Nagad (নগদ)</option>
                      <option value="Rocket">🚀 Rocket (রকেট)</option>
                      <option value="Upay">⚡ Upay (উপায়)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-amber-200/90 font-bold block mb-1">মোবাইল নম্বর (১১ ডিজিট):</label>
                    <input
                      type="number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full bg-[#1b0e06]/85 border border-amber-600/40 rounded-xl p-2 text-sm text-white outline-none shadow-inner placeholder-amber-200/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-amber-200/90 font-bold block mb-1">টাকার পরিমাণ (সর্বনিম্ন ৳৫০):</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="৫০"
                      className="w-full bg-[#1b0e06]/85 border border-amber-600/40 rounded-xl p-2 text-sm text-white outline-none shadow-inner placeholder-amber-200/30"
                    />
                  </div>

                  <button
                    onClick={submitWithdraw}
                    className="w-full mt-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 text-slate-950 font-black py-2.5 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.6)] active:scale-95 transition"
                  >
                    টাকা তুলুন
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
