'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './Lookbook.module.css';
import CuriosityWord from './animations/CuriosityWord';
import ReviewsSponsors from './ReviewsSponsors';
import SubscriptionTeaser from './SubscriptionTeaser';
import { getTabCompletions, findCommonPrefix } from './terminalTabCompletion';
import Footer from '../layout/Footer';

/* Cyber backdrop loads independently from main content */
const CyberBackdrop = dynamic(() => import('./CyberBackdrop'), { ssr: false });

/* Thuật toán Lookbook Snap — snap thẳng vào từng khung */
const SNAP_DEBOUNCE = 180;
const DESKTOP_MIN = 901;
const STORE_KEY = 'bashlab:lookbook-snap';

/* Đúng 5 phần cấu trúc cũ */
const PAGES = [
  { id: 'start', label: 'Start' },
  { id: 'try', label: 'Try' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'questions', label: 'Questions' },
];

const RESPONSES = {
  'cat about.txt': { out: 'BashLab provides short guided lessons, real browser practice, and requirement feedback.', desc: 'Displaying text file contents with cat.' },
  'cat getting-started.txt': { out: 'Browse courses -> open a course -> choose a lesson -> start practicing.', desc: 'Getting started guide loaded.' },
  courses: { out: 'Shell 101 — Bash Basics [Available now at /courses/shell-101]', desc: 'Explore the full course syllabus in the course section below.' },
};

function preparePingPlan(cmd) {
  const parts = cmd.trim().split(/\s+/);
  const args = parts.slice(1);

  if (args.length === 0) {
    return {
      immediate: true,
      type: 'error',
      content: 'ping: usage error: Destination address required',
      desc: 'Usage: ping <destination> (e.g. ping google.com, ping localhost, ping 8.8.8.8)',
    };
  }

  if (args.includes('-h') || args.includes('--help')) {
    return {
      immediate: true,
      type: 'output',
      content: 'Usage: ping [-aAbBdDfhLnOqrRUvV6] [-c count] [-i interval] [-s packetsize] [-t ttl] destination',
      desc: 'ping sends ICMP ECHO_REQUEST packets to network hosts.',
    };
  }

  let count = 4;
  let target = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-c' && i + 1 < args.length) {
      const parsed = parseInt(args[i + 1], 10);
      if (!isNaN(parsed) && parsed > 0) count = Math.min(parsed, 8);
      i++;
    } else if (!args[i].startsWith('-')) {
      target = args[i];
    }
  }

  if (!target) {
    return {
      immediate: true,
      type: 'error',
      content: 'ping: usage error: Destination address required',
      desc: 'Usage: ping <destination> (e.g. ping google.com, ping localhost)',
    };
  }

  const cleanTarget = target.toLowerCase();
  let ip = '';
  let isLocal = false;

  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(cleanTarget)) {
    ip = cleanTarget;
    if (ip.startsWith('127.')) isLocal = true;
  } else if (cleanTarget === 'localhost' || cleanTarget === 'bashlab') {
    ip = '127.0.0.1';
    isLocal = true;
  } else if (cleanTarget.includes('google')) {
    ip = '142.250.190.46';
  } else if (cleanTarget.includes('bashlab.dev') || cleanTarget.includes('vercel')) {
    ip = '76.76.21.21';
  } else if (cleanTarget.includes('cloudflare')) {
    ip = '1.1.1.1';
  } else if (cleanTarget.includes('github')) {
    ip = '140.82.121.4';
  } else {
    if (!/^[a-zA-Z0-9.-]+$/.test(cleanTarget)) {
      return {
        immediate: true,
        type: 'error',
        content: `ping: unknown host: ${target}`,
      };
    }
    let hash = 0;
    for (let i = 0; i < cleanTarget.length; i++) {
      hash = (hash * 31 + cleanTarget.charCodeAt(i)) >>> 0;
    }
    ip = `${(hash % 150) + 50}.${((hash >> 4) % 200) + 10}.${((hash >> 8) % 200) + 10}.${((hash >> 12) % 250) + 1}`;
  }

  const baseTime = isLocal ? 0.038 : (11.4 + (ip.charCodeAt(0) % 7));
  const variance = isLocal ? 0.011 : 1.5;
  const ttl = isLocal ? 64 : 116;

  const times = [];
  const packets = [];

  for (let seq = 1; seq <= count; seq++) {
    const jitter = (Math.sin(seq * 2.1) * 0.5 + (seq % 2 ? 0.4 : -0.3)) * variance;
    const t = Math.max(0.018, +(baseTime + jitter).toFixed(3));
    times.push(t);
    packets.push(`64 bytes from ${ip}: icmp_seq=${seq} ttl=${ttl} time=${t} ms`);
  }

  const min = Math.min(...times).toFixed(3);
  const max = Math.max(...times).toFixed(3);
  const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(3);
  const mdev = Math.sqrt(times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length).toFixed(3);
  const totalTime = Math.round(count * 1000 + 3);

  const statsLines = [
    '',
    `--- ${target} ping statistics ---`,
    `${count} packets transmitted, ${count} received, 0% packet loss, time ${totalTime}ms`,
    `rtt min/avg/max/mdev = ${min}/${avg}/${max}/${mdev} ms`
  ].join('\n');

  return {
    immediate: false,
    header: `PING ${target} (${ip}) 56(84) bytes of data.`,
    packets,
    stats: statsLines,
    desc: 'ping tests network connectivity and round-trip time (RTT) by sending ICMP ECHO_REQUEST packets.',
  };
}

function prepareIfconfig(cmd, isRoot = false) {
  const cleanCmd = cmd.trim();
  const parts = cleanCmd.split(/\s+/);
  const isSudo = parts[0].toLowerCase() === 'sudo';
  const effectiveParts = isSudo ? parts.slice(1) : parts;
  const args = effectiveParts.slice(1);

  const eth0Output = `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.15  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::a00:27ff:fe4e:66a1  prefixlen 64  scopeid 0x20<link>
        ether 08:00:27:4e:66:a1  txqueuelen 1000  (Ethernet)
        RX packets 14205  bytes 12584102 (12.0 MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 8912  bytes 1140921 (1.0 MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0`;

  const loOutput = `lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 240  bytes 19200 (18.7 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 240  bytes 19200 (18.7 KiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0`;

  if (args.length === 0 || args[0] === '-a') {
    return {
      type: 'output',
      content: `${eth0Output}\n\n${loOutput}`,
      desc: 'ifconfig displays network interface configuration and IP addresses.',
    };
  }

  const target = args[0].toLowerCase();
  if (target === 'eth0') {
    return {
      type: 'output',
      content: eth0Output,
      desc: 'Displaying eth0 interface configuration.',
    };
  }
  if (target === 'lo') {
    return {
      type: 'output',
      content: loOutput,
      desc: 'Displaying loopback interface configuration.',
    };
  }
  if (target === '-s') {
    return {
      type: 'output',
      content: `Iface      MTU    RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg\neth0      1500    14205      0      0 0          8912      0      0      0 BMRU\nlo       65536      240      0      0 0           240      0      0      0 LRU`,
      desc: 'Displaying short network interface summary list.',
    };
  }
  if (target === '-h' || target === '--help') {
    return {
      type: 'output',
      content: `Usage:\n  ifconfig [-a] [-v] [-s] <interface> [[<AF>] <address>]\n  [add <address>[/<prefixlen>]]\n  [del <address>[/<prefixlen>]]\n  [[-]broadcast [<address>]]  [[-]pointopoint [<address>]]\n  [netmask <address>]  [dstaddr <address>]  [tunnel <address>]\n  [txqueuelen <NN>]\n  [up] [down] ...`,
      desc: 'ifconfig help information.',
    };
  }

  if (args.length > 1) {
    if (!isRoot && !isSudo) {
      return {
        type: 'error',
        content: 'SIOCSIFADDR: Permission denied',
      };
    }
    return {
      type: 'output',
      content: `[+] Interface ${args[0]} configuration updated (virtual sandbox).`,
      desc: 'Network interface configuration updated.',
    };
  }

  return {
    type: 'error',
    content: `${args[0]}: error fetching interface information: Device not found`,
  };
}

const FAQS = [
  {
    q: 'Do I need to install anything?',
    a: 'No. BashLab runs a genuine containerized Linux environment directly in your browser. All you need is an updated modern web browser.',
  },
  {
    q: 'Is my progress saved?',
    a: 'Yes. Your course completion, lesson milestones, and exercise checks are permanently tied to your learner account.',
  },
  {
    q: 'What happens when a practice session ends?',
    a: 'Practice sandboxes are ephemeral and automatically recycle after 10–15 minutes of inactivity to keep resources clean. Your learning progress remains permanently saved.',
  },
];

const PIPELINE_STEPS = [
  {
    num: '01',
    color: '#68DFA0',
    glow: 'rgba(104, 223, 160, 0.4)',
    tag: 'VISUAL CONCEPT',
    title: 'Understand the map',
    desc: 'See how folders and paths connect before running any command.',
    subtext: 'Visual directory tree · Clear mental model',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </svg>
    ),
  },
  {
    num: '02',
    color: '#78CBD4',
    glow: 'rgba(120, 203, 212, 0.4)',
    tag: 'REAL TERMINAL',
    title: 'Practice in real Linux',
    desc: 'Type and run real Bash commands right in your browser. Zero setup.',
    subtext: 'Instant sandbox · No install needed',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    num: '03',
    color: '#FFB800',
    glow: 'rgba(255, 184, 0, 0.4)',
    tag: 'INSTANT CHECKS',
    title: 'Get instant feedback',
    desc: 'Automated checks tell you right away what worked and what to fix.',
    subtext: 'Pass/fail verification · Learn by doing',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
];

function isDesktop() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= DESKTOP_MIN;
}

function reducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const HERO_QUOTES = [
  {
    id: 'curiosity',
    line1: 'Every command starts',
    prefix2: 'with ',
    greenWord: 'curiosity',
    suffix2: '.',
  },
  {
    id: 'keystroke',
    line1: 'Every mastery begins',
    prefix2: 'with a ',
    greenWord: 'single keystroke',
    suffix2: '.',
  },
  {
    id: 'sandbox',
    line1: 'Break the sandbox,',
    prefix2: '',
    greenWord: 'not your machine',
    suffix2: '.',
  },
  {
    id: 'browser',
    line1: 'Real Linux in browser,',
    prefix2: '',
    greenWord: 'zero setup required',
    suffix2: '.',
  },
  {
    id: 'confidence',
    line1: 'Think in commands,',
    prefix2: '',
    greenWord: 'build with confidence',
    suffix2: '.',
  },
  {
    id: 'beginner',
    line1: 'Every expert was once',
    prefix2: 'a ',
    greenWord: 'complete beginner',
    suffix2: '.',
  },
];

const SECRET_QUOTE = {
  id: 'secret',
  line1: 'Can you unveil',
  prefix2: 'the ',
  greenWord: 'secret',
  suffix2: '?',
  isGlitch: true,
  transformTo: 'pwn3d',
};

function getQuoteTotalLen(quote) {
  return quote.line1.length + quote.prefix2.length + quote.greenWord.length + quote.suffix2.length;
}

function renderQuoteContent(quote, charCount, isIdle) {
  const l1Len = quote.line1.length;
  const p2Len = quote.prefix2.length;
  const gwLen = quote.greenWord.length;
  const s2Len = quote.suffix2.length;

  const l1Chars = Math.min(charCount, l1Len);
  const line1Text = quote.line1.slice(0, l1Chars);
  const isLine1Active = charCount <= l1Len;

  const l2Chars = Math.max(0, charCount - l1Len);
  let line2Content = null;

  if (l2Chars > 0) {
    if (isIdle && l2Chars === p2Len + gwLen + s2Len) {
      line2Content = (
        <>
          {quote.prefix2}
          <CuriosityWord
            key={quote.id}
            word={quote.greenWord}
            transformTo={quote.transformTo}
            isGlitch={quote.isGlitch}
          />
          {quote.suffix2}
        </>
      );
    } else {
      const p2Slice = quote.prefix2.slice(0, Math.min(l2Chars, p2Len));
      const remAfterP2 = Math.max(0, l2Chars - p2Len);
      const gwSlice = remAfterP2 > 0 ? quote.greenWord.slice(0, Math.min(remAfterP2, gwLen)) : '';
      const remAfterGw = Math.max(0, remAfterP2 - gwLen);
      const s2Slice = remAfterGw > 0 ? quote.suffix2.slice(0, Math.min(remAfterGw, s2Len)) : '';

      line2Content = (
        <>
          {p2Slice}
          {gwSlice ? (
            <span className={`${styles.greenText} ${quote.isGlitch ? styles.glitchText : ''}`}>
              {gwSlice}
            </span>
          ) : null}
          {s2Slice}
        </>
      );
    }
  }

  return {
    line1Text,
    isLine1Active,
    line2Content,
    isLine2Active: !isLine1Active,
  };
}

export default function Lookbook() {
  const sectionRefs = useRef([]);
  const scrollTimer = useRef(null);
  const snappingUntil = useRef(0);
  const toastTimer = useRef(null);
  const rafTick = useRef(false);
  const logRef = useRef(null);
  const termRef = useRef(null);
  const termInputRef = useRef(null);
  const termGreenRef = useRef(null);
  const termReopenRef = useRef(null);
  const placeholderRef = useRef(null);
  const backdropRef = useRef(null);
  const inlineHeightRef = useRef(390);
  const isAnimatingRef = useRef(false);



  /* Cyber Glow & Status LED */
  const [sysStatus, setSysStatus] = useState('SYS_READY');
  const statusTimerRef = useRef(null);
  const pingTimersRef = useRef([]);
  const [isPinging, setIsPinging] = useState(false);
  const clearPingTimers = useCallback(() => {
    pingTimersRef.current.forEach(clearTimeout);
    pingTimersRef.current = [];
    setIsPinging(false);
  }, []);

  const [active, setActive] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [toast, setToast] = useState(null);
  const [openAcc, setOpenAcc] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [cmdHistory, setCmdHistory] = useState(['ls', 'whoami']);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const autoRunTimersRef = useRef([]);
  const autoRunActiveRef = useRef(false);
  const hasAutoRunRef = useRef(false);

  const cancelAutoRun = useCallback(() => {
    if (!autoRunActiveRef.current) return;
    autoRunActiveRef.current = false;
    autoRunTimersRef.current.forEach(clearTimeout);
    autoRunTimersRef.current = [];
  }, []);
  /* Kích thước terminal: default | minimized | expanded | closed */
  const [termSize, setTermSize] = useState('default');
  /* Trạng thái fade màu nền theme khi phóng to/thu nhỏ terminal: 'idle' | 'gray-in' | 'gray-out' */
  const [termFadeState, setTermFadeState] = useState('idle');
  /* Quyền hạn terminal: guest hoặc root */
  const [isRoot, setIsRoot] = useState(false);
  const [isWaitingPassword, setIsWaitingPassword] = useState(false);
  const [failedPasswordAttempts, setFailedPasswordAttempts] = useState(0);
  const [passwordCooldownUntil, setPasswordCooldownUntil] = useState(() => {
    try {
      const saved = sessionStorage.getItem('bashlab:pwd_cooldown_until');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed > Date.now()) return parsed;
      }
    } catch {}
    return 0;
  });
  const [isWaitingFlag, setIsWaitingFlag] = useState(false);
  const [currentDir, setCurrentDir] = useState('');
  const [isPandoraUnlocked, setIsPandoraUnlocked] = useState(false);
  const [isPandoraModalOpen, setIsPandoraModalOpen] = useState(false);
  const pandoraVideoRef = useRef(null);

  useEffect(() => {
    if (isPandoraModalOpen && pandoraVideoRef.current) {
      pandoraVideoRef.current.currentTime = 0;
      const p = pandoraVideoRef.current.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    } else if (pandoraVideoRef.current) {
      pandoraVideoRef.current.pause();
    }
  }, [isPandoraModalOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isPandoraModalOpen) {
        setIsPandoraModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isPandoraModalOpen]);

  /* Hero Quote Carousel (Typewriter & Deletion) */
  const [isSecretMode, setIsSecretMode] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [typeMode, setTypeMode] = useState('idle'); // 'idle' | 'deleting' | 'typing'
  const [charCount, setCharCount] = useState(() => getQuoteTotalLen(HERO_QUOTES[0]));
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [isCuriosityBusy, setIsCuriosityBusy] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.removeItem('bashlab:unveil_secret');
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined' && !window.location.hash) {
      window.scrollTo(0, 0);
      if (window.lenis) {
        window.lenis.scrollTo(0, { immediate: true });
      }
    }
  }, []);

  const triggerQuoteChange = useCallback((newTarget) => {
    if (isSecretMode) return;
    setTargetIndex((prevTarget) => {
      if (typeof newTarget === 'number') {
        if (newTarget === quoteIndex && typeMode === 'idle') return prevTarget;
        return newTarget;
      }
      return (prevTarget + 1) % HERO_QUOTES.length;
    });
    setTypeMode('deleting');
  }, [quoteIndex, typeMode, isSecretMode]);

  /* Typewriter engine: xóa lùi từng ký tự khi chuyển quote, rồi gõ từng ký tự của quote mới */
  useEffect(() => {
    if (isSecretMode) {
      return undefined;
    }

    if (reducedMotion()) {
      if (typeMode !== 'idle') {
        setQuoteIndex(targetIndex);
        setCharCount(getQuoteTotalLen(HERO_QUOTES[targetIndex]));
        setTypeMode('idle');
      }
      return undefined;
    }

    if (typeMode === 'idle') {
      if (isHeroHovered || isCuriosityBusy) return undefined;
      const timer = setTimeout(() => {
        triggerQuoteChange();
      }, 5500);
      return () => clearTimeout(timer);
    }

    if (typeMode === 'deleting') {
      if (charCount > 0) {
        const timer = setTimeout(() => {
          setCharCount((prev) => Math.max(0, prev - 1));
        }, 18);
        return () => clearTimeout(timer);
      }
      const timer = setTimeout(() => {
        setQuoteIndex(targetIndex);
        setTypeMode('typing');
      }, 180);
      return () => clearTimeout(timer);
    }

    if (typeMode === 'typing') {
      const targetLen = getQuoteTotalLen(HERO_QUOTES[quoteIndex]);
      if (charCount < targetLen) {
        const timer = setTimeout(() => {
          setCharCount((prev) => Math.min(targetLen, prev + 1));
        }, 36);
        return () => clearTimeout(timer);
      }
      setTypeMode('idle');
    }

    return undefined;
  }, [typeMode, charCount, quoteIndex, targetIndex, isHeroHovered, isCuriosityBusy, triggerQuoteChange, isSecretMode]);

  /* Lắng nghe sự kiện từ CuriosityWord để không chuyển quote khi đang nổ hạt */
  useEffect(() => {
    const section = sectionRefs.current[0];
    if (!section) return undefined;
    const onCuriosity = (e) => {
      setIsCuriosityBusy(Boolean(e.detail?.active));
    };
    section.addEventListener('bashlab:curiosity', onCuriosity);
    return () => {
      section.removeEventListener('bashlab:curiosity', onCuriosity);
    };
  }, []);

  /* Tạm dừng chuyển quote khi tab trình duyệt bị ẩn */
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setIsHeroHovered(true);
      } else {
        setIsHeroHovered(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const [visibleSections, setVisibleSections] = useState({ 0: true, 1: true, 2: true, 3: true, 4: true });
  const termSizeRef = useRef('default');
  termSizeRef.current = termSize;
  const [logEntries, setLogEntries] = useState([]);

  const activeRef = useRef(0);
  const enabledRef = useRef(true);
  const wasPingingRef = useRef(false);
  const wheelLockRef = useRef(false);
  const wheelTimerRef = useRef(null);
  const targetIndexRef = useRef(null);
  activeRef.current = active;
  enabledRef.current = enabled;

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORE_KEY);
      if (v === '0') {
        window.localStorage.removeItem(STORE_KEY);
      }
      setEnabled(true);
    } catch {
      /* giữ mặc định ON */
    }
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const smoothScrollTo = useCallback((target) => {
    const duration = 0.72;
    snappingUntil.current = Date.now() + Math.round(duration * 1000 + 50);

    if (window.lenis) {
      window.lenis.scrollTo(target, { duration });
    } else {
      const targetTop = typeof target === 'number'
        ? target
        : (target ? (target.getBoundingClientRect().top + window.pageYOffset) : 0);
      window.scrollTo({ top: targetTop, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
  }, []);

  const goTo = useCallback((index) => {
    const el = sectionRefs.current[index];
    if (!el && index !== 0) return;
    targetIndexRef.current = index;
    setActive(index);
    if (index === 0) {
      smoothScrollTo(0);
    } else if (el) {
      smoothScrollTo(el);
    }
  }, [smoothScrollTo]);

  /* Lắng nghe sự kiện kích hoạt Easter Egg từ Footer */
  useEffect(() => {
    const handleSecretActivation = () => {
      try {
        sessionStorage.removeItem('bashlab:unveil_secret');
      } catch {}
      setIsSecretMode(true);
      setCharCount(getQuoteTotalLen(SECRET_QUOTE));
      setTypeMode('idle');
      goTo(0);
    };

    window.addEventListener('bashlab:activate_secret_quote', handleSecretActivation);
    return () => {
      window.removeEventListener('bashlab:activate_secret_quote', handleSecretActivation);
    };
  }, [goTo]);

  useEffect(() => {
    function updateActive() {
      rafTick.current = false;
      const sections = sectionRefs.current.filter(Boolean);
      if (!sections.length) return;
      const mid = window.innerHeight / 2;
      for (let i = 0; i < sections.length; i += 1) {
        const r = sections[i].getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) {
          if (activeRef.current !== i) setActive(i);
          return;
        }
      }
      const last = sections[sections.length - 1].getBoundingClientRect();
      if (last.bottom < mid && activeRef.current !== sections.length - 1) {
        setActive(sections.length - 1);
      }
    }

    function onScrollStop() {
      targetIndexRef.current = null;
      if (termSizeRef.current === 'expanded') return;
      if (!enabledRef.current) return;
      if (!isDesktop()) return;
      if (Date.now() < snappingUntil.current) return;
      const sections = sectionRefs.current.filter(Boolean);
      if (sections.length < PAGES.length) return;

      let best = -1;
      let bestAbs = Infinity;
      for (let i = 0; i < sections.length; i += 1) {
        const diff = sections[i].getBoundingClientRect().top;
        const abs = Math.abs(diff);
        if (abs < bestAbs) {
          bestAbs = abs;
          best = i;
        }
      }
      if (best >= 0 && bestAbs > 2) {
        setActive(best);
        targetIndexRef.current = best;
        smoothScrollTo(best === 0 ? 0 : sections[best]);
      }
    }

    function onScroll() {
      if (!rafTick.current) {
        rafTick.current = true;
        window.requestAnimationFrame(updateActive);
      }
      if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
      scrollTimer.current = window.setTimeout(onScrollStop, SNAP_DEBOUNCE);
    }

    function onWheel(e) {
      if (termSizeRef.current === 'expanded') return;
      if (!enabledRef.current) return;
      if (!isDesktop()) return;

      const targetEl = e.target;
      if (targetEl) {
        const scrollable = targetEl.closest?.(`.${styles.termLog}`) || targetEl.closest?.('[role="dialog"]');
        if (scrollable) {
          const hasScroll = scrollable.scrollHeight > scrollable.clientHeight;
          if (hasScroll) {
            const atTop = scrollable.scrollTop <= 0 && e.deltaY < 0;
            const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 2 && e.deltaY > 0;
            if (!atTop && !atBottom) {
              return;
            }
          }
        }
      }

      // Nuốt sự kiện wheel để snap mượt
      e.preventDefault();
      e.stopPropagation();

      // Nếu đang trong thời gian chặn dội (echo) của 1 nấc cuộn: bỏ qua ngay
      if (wheelLockRef.current) {
        return;
      }

      // Bỏ qua rung lắc vi mô (< 10px)
      if (Math.abs(e.deltaY) < 10) return;

      wheelLockRef.current = true;
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        wheelLockRef.current = false;
      }, 160);

      const cur = targetIndexRef.current !== null ? targetIndexRef.current : activeRef.current;

      if (e.deltaY > 0) {
        // Lăn xuống: chuyển đúng 1 khung tiếp theo
        if (cur < PAGES.length - 1 && (cur + 1 === 0 || sectionRefs.current[cur + 1])) {
          goTo(cur + 1);
        }
      } else if (e.deltaY < 0) {
        // Lăn lên: chuyển đúng 1 khung trước đó
        if (cur > 0 && (cur - 1 === 0 || sectionRefs.current[cur - 1])) {
          goTo(cur - 1);
        }
      }
    }

    let touchStartY = 0;
    function onTouchStart(e) {
      if (e.touches && e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
      }
    }

    function onTouchEnd(e) {
      if (termSizeRef.current === 'expanded') return;
      if (!enabledRef.current) return;
      if (!isDesktop()) return;
      if (wheelLockRef.current) return;
      if (!e.changedTouches || e.changedTouches.length === 0) return;

      const diffY = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(diffY) < 45) return;

      wheelLockRef.current = true;
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        wheelLockRef.current = false;
      }, 180);

      const cur = targetIndexRef.current !== null ? targetIndexRef.current : activeRef.current;

      if (diffY > 0) {
        // Vuốt lên -> sang đúng 1 khung kế tiếp
        if (cur < PAGES.length - 1 && (cur + 1 === 0 || sectionRefs.current[cur + 1])) {
          goTo(cur + 1);
        }
      } else if (diffY < 0) {
        // Vuốt xuống -> về đúng 1 khung trước đó
        if (cur > 0 && (cur - 1 === 0 || sectionRefs.current[cur - 1])) {
          goTo(cur - 1);
        }
      }
    }

    function onKey(e) {
      if (termSizeRef.current === 'expanded') return;
      if (!enabledRef.current) return;
      if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(e.key)) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (!isDesktop()) return;
      e.preventDefault();
      const cur = targetIndexRef.current !== null ? targetIndexRef.current : activeRef.current;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        if (cur < PAGES.length - 1) {
          goTo(cur + 1);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        if (cur > 0) {
          goTo(cur - 1);
        }
      } else if (e.key === 'Home') {
        goTo(0);
      } else if (e.key === 'End') {
        goTo(PAGES.length - 1);
      }
    }

    updateActive();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
      if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
    };
  }, [goTo, smoothScrollTo]);

  useEffect(() => {
    const els = sectionRefs.current.filter(Boolean);
    if (!('IntersectionObserver' in window)) {
      setVisibleSections({ 0: true, 1: true, 2: true, 3: true, 4: true });
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            const idx = sectionRefs.current.indexOf(en.target);
            if (idx !== -1) {
              setVisibleSections((prev) => ({ ...prev, [idx]: true }));
            }
          }
        });
      },
      { threshold: 0.25 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logEntries, inputValue]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const expandTerminal = useCallback(async () => {
    const el = termRef.current;
    if (!el || isAnimatingRef.current) return;
    if (reducedMotion()) {
      setTermSize('expanded');
      return;
    }
    isAnimatingRef.current = true;
    if (el) el.style.transform = 'none';

    // Bước 1: Toàn bộ bên trong khung terminal fade dần sang màu nền theme (trừ 3 nút điều khiển)
    setTermFadeState('gray-in');
    await new Promise((r) => setTimeout(r, 200));

    // Bước 2: Bắt đầu phóng to khung terminal
    const first = el.getBoundingClientRect();
    inlineHeightRef.current = first.height;

    flushSync(() => {
      setTermSize('expanded');
    });

    const last = el.getBoundingClientRect();
    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;
    const scaleX = Math.max(0.01, (first.width || 1) / (last.width || 1));
    const scaleY = Math.max(0.01, (first.height || 1) / (last.height || 1));

    if (backdropRef.current) {
      backdropRef.current.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
      );
    }

    const anim = el.animate(
      [
        {
          transformOrigin: 'top left',
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
        },
        {
          transformOrigin: 'top left',
          transform: 'none',
        },
      ],
      {
        duration: 270,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      }
    );

    let finished = false;
    const onFinish = () => {
      if (finished) return;
      finished = true;
      try { anim.cancel(); } catch {}
      // Bước 3: Đã phóng to xong -> từ màu nền theme fade dần trả lại nội dung bên trong
      setTermFadeState('gray-out');
      setTimeout(() => {
        setTermFadeState('idle');
        isAnimatingRef.current = false;
        termInputRef.current?.focus({ preventScroll: true });
      }, 230);
    };

    anim.onfinish = onFinish;
    setTimeout(onFinish, 350);
  }, []);

  const restoreTerminal = useCallback(async () => {
    const el = termRef.current;
    const placeholder = placeholderRef.current;
    if (!el || isAnimatingRef.current) return;
    if (reducedMotion() || !placeholder) {
      setTermSize('default');
      return;
    }

    isAnimatingRef.current = true;

    // Bước 1: Fade nội dung bên trong sang màu nền theme web (trừ 3 nút điều khiển)
    setTermFadeState('gray-in');
    await new Promise((r) => setTimeout(r, 200));

    // Bước 2: Bắt đầu thu nhỏ khung terminal về lại vị trí inline ban đầu
    const first = el.getBoundingClientRect();
    const last = placeholder.getBoundingClientRect();

    const deltaX = last.left - first.left;
    const deltaY = last.top - first.top;
    const scaleX = Math.max(0.01, (last.width || 1) / (first.width || 1));
    const scaleY = Math.max(0.01, (last.height || 1) / (first.height || 1));

    if (backdropRef.current) {
      backdropRef.current.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
      );
    }

    const anim = el.animate(
      [
        {
          transformOrigin: 'top left',
          transform: 'none',
        },
        {
          transformOrigin: 'top left',
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
        },
      ],
      {
        duration: 250,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards',
      }
    );

    let finished = false;
    const onFinish = () => {
      if (finished) return;
      finished = true;
      flushSync(() => {
        setTermSize('default');
      });
      try { anim.cancel(); } catch {}
      // Bước 3: Đã thu nhỏ xong -> fade trả lại nội dung bên trong
      setTermFadeState('gray-out');
      setTimeout(() => {
        setTermFadeState('idle');
        isAnimatingRef.current = false;
        termGreenRef.current?.focus({ preventScroll: true });
      }, 230);
    };

    anim.onfinish = onFinish;
    setTimeout(onFinish, 350);
  }, []);

  /* Khóa tương tác nền & cuộn trang khi terminal phóng to: chỉ cho phép tương tác trong terminal */
  useEffect(() => {
    if (termSize !== 'expanded') return undefined;

    // 1. Tạm dừng Lenis smooth scroll
    if (window.lenis) {
      window.lenis.stop();
    }

    // 2. Chặn sự kiện wheel lan truyền ra ngoài:
    // - Cho phép cuộn bên trong .termLog
    // - Khi log chạm đỉnh/đáy (overscroll) hoặc cuộn ngoài log -> chặn tuyệt đối
    function handleWheel(e) {
      const log = logRef.current;
      if (log && log.contains(e.target)) {
        const isAtTop = log.scrollTop <= 0 && e.deltaY < 0;
        const isAtBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 1 && e.deltaY > 0;
        if (isAtTop || isAtBottom) {
          e.preventDefault();
        }
        return;
      }
      e.preventDefault();
    }

    function handleTouchMove(e) {
      const log = logRef.current;
      if (log && log.contains(e.target)) return;
      e.preventDefault();
    }

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      if (window.lenis) {
        window.lenis.start();
      }
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [termSize]);

  /* Escape: terminal phóng to thu nhỏ trở về mặc định (không can thiệp body padding gây giật layout) */
  useEffect(() => {
    if (termSize !== 'expanded') return undefined;
    function onEsc(e) {
      if (e.key === 'Escape') {
        restoreTerminal();
      }
    }
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('keydown', onEsc);
    };
  }, [termSize, restoreTerminal]);

  function toggleSnap() {
    setEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORE_KEY, next ? '1' : '0');
      } catch {
        /* bỏ qua */
      }
      showToast(`Lookbook snap — ${next ? 'ON' : 'OFF'}`);
      return next;
    });
  }



  /* Tự động chạy lệnh ls rồi whoami:
     Cứ scroll đến khung terminal là trigger đếm ngược 0.3s rồi tự chạy.
     Kể cả khi scroll luôn sang page khác thì terminal vẫn tiếp tục chạy hoàn tất.
  */
  useEffect(() => {
    if (active !== 1 || hasAutoRunRef.current) return;
    hasAutoRunRef.current = true;
    autoRunActiveRef.current = true;

    const timers = [];
    const START_DELAY = 300;

    if (reducedMotion()) {
      const t = setTimeout(() => {
        setLogEntries([
          { type: 'prompt', cmd: 'ls', user: 'guest', dir: '' },
          { type: 'output', content: 'System/   about.txt   courses/   getting-started.txt' },
          { type: 'prompt', cmd: 'whoami', user: 'guest', dir: '' },
          { type: 'output', content: 'guest' },
        ]);
        autoRunActiveRef.current = false;
      }, START_DELAY);
      timers.push(t);
      autoRunTimersRef.current = timers;
      return;
    }

    // Bước 1: Gõ lệnh 'ls'
    timers.push(
      setTimeout(() => {
        if (!autoRunActiveRef.current) return;
        setInputValue('l');
      }, START_DELAY + 120)
    );

    timers.push(
      setTimeout(() => {
        if (!autoRunActiveRef.current) return;
        setInputValue('ls');
      }, START_DELAY + 260)
    );

    // Bước 2: Thực thi 'ls'
    timers.push(
      setTimeout(() => {
        if (!autoRunActiveRef.current) return;
        setInputValue('');
        setLogEntries([
          { type: 'prompt', cmd: 'ls', user: 'guest', dir: '' },
          { type: 'output', content: 'System/   about.txt   courses/   getting-started.txt' },
        ]);
      }, START_DELAY + 480)
    );

    // Bước 3: Gõ lệnh 'whoami'
    const whoamiSteps = ['w', 'wh', 'who', 'whoa', 'whoam', 'whoami'];
    whoamiSteps.forEach((s, idx) => {
      timers.push(
        setTimeout(() => {
          if (!autoRunActiveRef.current) return;
          setInputValue(s);
        }, START_DELAY + 760 + idx * 65)
      );
    });

    // Bước 4: Thực thi 'whoami'
    timers.push(
      setTimeout(() => {
        if (!autoRunActiveRef.current) return;
        setInputValue('');
        setLogEntries([
          { type: 'prompt', cmd: 'ls', user: 'guest', dir: '' },
          { type: 'output', content: 'System/   about.txt   courses/   getting-started.txt' },
          { type: 'prompt', cmd: 'whoami', user: 'guest', dir: '' },
          { type: 'output', content: 'guest' },
        ]);
        autoRunActiveRef.current = false;
      }, START_DELAY + 760 + whoamiSteps.length * 65 + 160)
    );

    autoRunTimersRef.current = timers;
  }, [active]);

  // Dọn dẹp timer khi toàn bộ component unmount
  useEffect(() => {
    return () => {
      autoRunActiveRef.current = false;
      autoRunTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  /* Dọn dẹp timer trạng thái LED & Ping */
  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    clearPingTimers();
  }, [clearPingTimers]);

  /* Lắng nghe phím Ctrl+C toàn cục khi ping đang chạy để ngắt tiến trình */
  useEffect(() => {
    if (!isPinging) return undefined;
    const handleGlobalKey = (e) => {
      if ((e.key === 'c' && (e.ctrlKey || e.metaKey)) || e.key === 'Escape') {
        e.preventDefault();
        clearPingTimers();
        setInputValue('');
        setLogEntries((prev) => [
          ...prev,
          { type: 'output', content: '^C' },
        ]);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isPinging, clearPingTimers]);

  /* Tự động focus lại ô gõ lệnh khi ping kết thúc (không chạy khi mới tải trang) */
  useEffect(() => {
    if (wasPingingRef.current && !isPinging) {
      setTimeout(() => {
        termInputRef.current?.focus({ preventScroll: true });
      }, 40);
    }
    wasPingingRef.current = isPinging;
  }, [isPinging]);

  function executeCommand(raw) {
    const cmd = (raw || '').trim();
    if (!cmd && !isWaitingPassword && !isWaitingFlag) return;

    clearPingTimers();

    if (!isWaitingPassword) {
      setCmdHistory((prev) => [...prev, cmd]);
      setHistoryIdx(-1);
    }

    // Cập nhật đèn LED trạng thái
    setSysStatus('EXEC_OK');
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setSysStatus('SYS_READY'), 1400);

    // 1. Đang trong phiên chờ nhập mật khẩu cho sudo
    if (isWaitingPassword) {
      const next = [
        ...logEntries,
        {
          type: 'prompt',
          promptLabel: '[sudo] password for guest: ',
          cmd: '',
          user: 'guest',
        },
      ];

      if (cmd === 'pwn3d' || cmd === 'pwned') {
        setIsRoot(true);
        setIsWaitingPassword(false);
        setFailedPasswordAttempts(0);
        setPasswordCooldownUntil(0);
        try {
          sessionStorage.removeItem('bashlab:pwd_cooldown_until');
        } catch {}
        next.push({ type: 'output', content: '[sudo] session opened for root' });
      } else {
        const nextAttempts = failedPasswordAttempts + 1;
        if (nextAttempts < 3) {
          setFailedPasswordAttempts(nextAttempts);
          setIsWaitingPassword(true);
          const left = 3 - nextAttempts;
          next.push({
            type: 'error',
            content: `Sorry, try again. (${left} attempt${left > 1 ? 's' : ''} left)`,
          });
        } else {
          setIsWaitingPassword(false);
          setFailedPasswordAttempts(0);
          const cooldownUntil = Date.now() + 5 * 60 * 1000;
          setPasswordCooldownUntil(cooldownUntil);
          try {
            sessionStorage.setItem('bashlab:pwd_cooldown_until', String(cooldownUntil));
          } catch {}
          next.push({ type: 'error', content: 'sudo: 3 incorrect password attempts' });
          next.push({
            type: 'error',
            content: 'sudo: account locked. Cooldown: 5 minutes.',
          });
        }
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 2. Đang trong phiên nhập Flag
    if (isWaitingFlag) {
      setIsWaitingFlag(false);
      const next = [
        ...logEntries,
        {
          type: 'prompt',
          promptLabel: '',
          cmd,
          user: isRoot ? 'root' : 'guest',
          dir: currentDir,
        },
      ];

      const FLAG = 'UCS{d1g_d33p_3n0ugh_4nd_y0u_w1ll_f1nd_0u7}';

      if (cmd === FLAG) {
        setIsPandoraUnlocked(true);
        next.push({
          type: 'output',
          content: 'Unlocked directory: P4nd0r4/',
        });
      } else if (!cmd || cmd.toLowerCase() === 'exit') {
        next.push({ type: 'output', content: 'Secret.sh: aborted.' });
      } else {
        next.push({ type: 'error', content: '[-] Incorrect flag. Try again!' });
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 3. Lệnh clear
    if (cmd.toLowerCase() === 'clear') {
      setIsWaitingPassword(false);
      setIsWaitingFlag(false);
      setLogEntries([]);
      setInputValue('');
      return;
    }

    const lowerCmd = cmd.toLowerCase();
    const next = [
      ...logEntries,
      { type: 'prompt', cmd, user: isRoot ? 'root' : 'guest', dir: currentDir },
    ];

    // 4. Lệnh sudo su (hoặc sudo su -, su, su root)
    if (
      lowerCmd === 'sudo su' ||
      lowerCmd === 'sudo su -' ||
      lowerCmd === 'sudo -i' ||
      lowerCmd === 'sudo -s' ||
      lowerCmd === 'sudo' ||
      lowerCmd === 'su' ||
      lowerCmd === 'su root'
    ) {
      if (isRoot) {
        next.push({ type: 'output', content: 'Already running as root.' });
      } else {
        const remainingMs = passwordCooldownUntil - Date.now();
        if (remainingMs > 0) {
          const totalSec = Math.ceil(remainingMs / 1000);
          const mins = Math.floor(totalSec / 60);
          const secs = totalSec % 60;
          const timeStr = mins > 0 ? `${mins}m ${secs < 10 ? '0' : ''}${secs}s` : `${secs}s`;
          next.push({
            type: 'error',
            content: `sudo: account is locked due to 3 failed attempts. Cooldown active (${timeStr} remaining).`,
          });
        } else {
          setIsWaitingPassword(true);
          setFailedPasswordAttempts(0);
        }
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // Hỗ trợ trường hợp gõ liền mật khẩu: sudo su pwn3d hoặc sudo su pwned
    if (lowerCmd === 'sudo su pwn3d' || lowerCmd === 'sudo su pwned') {
      const remainingMs = passwordCooldownUntil - Date.now();
      if (remainingMs > 0) {
        const totalSec = Math.ceil(remainingMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        const timeStr = mins > 0 ? `${mins}m ${secs < 10 ? '0' : ''}${secs}s` : `${secs}s`;
        next.push({
          type: 'error',
          content: `sudo: account is locked due to 3 failed attempts. Cooldown active (${timeStr} remaining).`,
        });
      } else {
        setIsRoot(true);
        setFailedPasswordAttempts(0);
        setPasswordCooldownUntil(0);
        try {
          sessionStorage.removeItem('bashlab:pwd_cooldown_until');
        } catch {}
        next.push({ type: 'output', content: '[sudo] session opened for root' });
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 4.5. Lệnh fastfetch / neofetch (hỗ trợ cả guest và sudo fastfetch)
    if (
      lowerCmd === 'fastfetch' ||
      lowerCmd.startsWith('fastfetch ') ||
      lowerCmd === 'sudo fastfetch' ||
      lowerCmd.startsWith('sudo fastfetch ') ||
      lowerCmd === 'neofetch' ||
      lowerCmd.startsWith('neofetch ') ||
      lowerCmd === 'sudo neofetch' ||
      lowerCmd.startsWith('sudo neofetch ')
    ) {
      const isSudo = lowerCmd.startsWith('sudo fastfetch') || lowerCmd.startsWith('sudo neofetch');
      const fetchUser = isSudo || isRoot ? 'root' : 'guest';
      next.push({
        type: 'fastfetch',
        user: fetchUser,
      });
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 5. Lệnh exit (thoát quyền root hoặc thoát thư mục)
    if (lowerCmd === 'exit' || lowerCmd === 'logout' || lowerCmd === 'su guest') {
      if (currentDir === 'P4nd0r4' || currentDir === 'System/Temp/P4nd0r4') {
        setCurrentDir(currentDir === 'System/Temp/P4nd0r4' ? 'System/Temp' : '');
        next.push({ type: 'output', content: 'exit' });
      } else if (currentDir === 'System/Temp') {
        setCurrentDir('System');
        next.push({ type: 'output', content: 'exit' });
      } else if (currentDir) {
        setCurrentDir('');
        next.push({ type: 'output', content: 'exit' });
      } else if (isRoot) {
        setIsRoot(false);
        next.push({ type: 'output', content: 'exit' });
      } else {
        next.push({ type: 'output', content: 'exit: session cannot be terminated in demo mode.' });
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    const KALI_FORBIDDEN = [
      'bin', 'boot', 'dev', 'etc', 'home', 'lib', 'lib64', 'media', 'mnt', 'opt', 'proc', 'root', 'run', 'sbin', 'srv', 'sys', 'usr', 'var', 'kali-config', 'os-release', 'vmlinuz'
    ];

    // Chặn cd vào các thư mục hệ thống Kali (kể cả root)
    const targetCd = KALI_FORBIDDEN.find((d) =>
      lowerCmd === `cd ${d}` ||
      lowerCmd === `cd ${d}/` ||
      lowerCmd === `cd ./${d}` ||
      lowerCmd === `cd ./${d}/` ||
      lowerCmd === `cd system/${d}` ||
      lowerCmd === `cd system/${d}/` ||
      lowerCmd === `cd ./system/${d}` ||
      lowerCmd === `cd ./system/${d}/`
    );

    if (targetCd) {
      next.push({ type: 'error', content: `bash: cd: ${targetCd}: Permission denied` });
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // Chặn chạy/đọc file hệ thống Kali (kể cả root)
    const targetExec = KALI_FORBIDDEN.find((d) =>
      lowerCmd === `./${d}` ||
      lowerCmd === `./system/${d}` ||
      lowerCmd === `cat ${d}` ||
      lowerCmd === `cat ./${d}` ||
      lowerCmd === `cat system/${d}` ||
      lowerCmd === `cat ./system/${d}` ||
      lowerCmd.startsWith(`./${d}/`) ||
      lowerCmd.startsWith(`./system/${d}/`) ||
      lowerCmd.startsWith(`bash ${d}`) ||
      lowerCmd.startsWith(`bash system/${d}`) ||
      lowerCmd.startsWith(`sh ${d}`) ||
      lowerCmd.startsWith(`sh system/${d}`)
    );

    if (targetExec) {
      next.push({ type: 'error', content: `bash: ${targetExec}: Permission denied` });
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // Chặn ls vào thư mục hệ thống Kali
    const targetLs = KALI_FORBIDDEN.find((d) =>
      lowerCmd === `ls ${d}` ||
      lowerCmd === `ls ${d}/` ||
      lowerCmd === `ls -la ${d}` ||
      lowerCmd === `ls -la ${d}/` ||
      lowerCmd === `ls -l ${d}` ||
      lowerCmd === `ls -l ${d}/` ||
      lowerCmd === `ls system/${d}` ||
      lowerCmd === `ls system/${d}/` ||
      lowerCmd === `ls -la system/${d}` ||
      lowerCmd === `ls -la system/${d}/` ||
      lowerCmd === `ls -l system/${d}` ||
      lowerCmd === `ls -l system/${d}/`
    );

    if (targetLs) {
      next.push({ type: 'error', content: `ls: cannot open directory '${targetLs}': Permission denied` });
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // Chuyển vào System hoặc System/Temp
    if (
      lowerCmd === 'cd system/temp' ||
      lowerCmd === 'cd system/temp/' ||
      lowerCmd === 'cd ./system/temp' ||
      lowerCmd === 'cd ./system/temp/' ||
      (currentDir === 'System' && (
        lowerCmd === 'cd temp' ||
        lowerCmd === 'cd temp/' ||
        lowerCmd === 'cd ./temp' ||
        lowerCmd === 'cd ./temp/'
      ))
    ) {
      if (!isRoot) {
        next.push({ type: 'error', content: 'bash: cd: System: Permission denied' });
      } else {
        setCurrentDir('System/Temp');
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    if (
      lowerCmd === 'cd system' ||
      lowerCmd === 'cd system/' ||
      lowerCmd === 'cd ./system' ||
      lowerCmd === 'cd ./system/'
    ) {
      if (!isRoot) {
        next.push({ type: 'error', content: 'bash: cd: System: Permission denied' });
      } else {
        setCurrentDir('System');
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    if (
      lowerCmd === 'cd credentials' ||
      lowerCmd === 'cd credentials/' ||
      lowerCmd === 'cd ./credentials' ||
      lowerCmd === 'cd ./credentials/'
    ) {
      if (!isRoot) {
        next.push({
          type: 'error',
          content: 'bash: cd: Credentials: Permission denied',
        });
      } else {
        setCurrentDir('Credentials');
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // Chuyển vào P4nd0r4
    const isCdPandora =
      lowerCmd === 'cd p4nd0r4' ||
      lowerCmd === 'cd p4nd0r4/' ||
      lowerCmd === 'cd ./p4nd0r4' ||
      lowerCmd === 'cd ./p4nd0r4/' ||
      lowerCmd === 'cd pandora' ||
      lowerCmd === 'cd pandora/' ||
      lowerCmd === 'cd ./pandora' ||
      lowerCmd === 'cd ./pandora/' ||
      lowerCmd === 'cd system/temp/p4nd0r4' ||
      lowerCmd === 'cd system/temp/p4nd0r4/' ||
      lowerCmd === 'cd ./system/temp/p4nd0r4' ||
      lowerCmd === 'cd ./system/temp/p4nd0r4/' ||
      (currentDir === 'System' && (
        lowerCmd === 'cd temp/p4nd0r4' ||
        lowerCmd === 'cd temp/p4nd0r4/' ||
        lowerCmd === 'cd ./temp/p4nd0r4'
      )) ||
      (currentDir === 'System/Temp' && (
        lowerCmd === 'cd p4nd0r4' ||
        lowerCmd === 'cd p4nd0r4/' ||
        lowerCmd === 'cd ./p4nd0r4' ||
        lowerCmd === 'cd pandora' ||
        lowerCmd === 'cd pandora/'
      ));

    if (isCdPandora) {
      if (!isPandoraUnlocked) {
        next.push({ type: 'error', content: 'bash: cd: P4nd0r4: No such file or directory' });
      } else {
        setCurrentDir(currentDir.startsWith('System') ? 'System/Temp/P4nd0r4' : 'P4nd0r4');
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    if (
      (currentDir === 'P4nd0r4' || currentDir === 'System/Temp/P4nd0r4') &&
      (lowerCmd === 'cd ..' || lowerCmd === 'cd ../')
    ) {
      setCurrentDir(currentDir === 'System/Temp/P4nd0r4' ? 'System/Temp' : '');
      setLogEntries(next);
      setInputValue('');
      return;
    }

    if (
      currentDir === 'System/Temp' &&
      (lowerCmd === 'cd ..' || lowerCmd === 'cd ../')
    ) {
      setCurrentDir('System');
      setLogEntries(next);
      setInputValue('');
      return;
    }

    if (
      lowerCmd === 'cd ..' ||
      lowerCmd === 'cd ../..' ||
      lowerCmd === 'cd ~' ||
      lowerCmd === 'cd /' ||
      lowerCmd === 'cd' ||
      lowerCmd === 'cd /bashlab'
    ) {
      setCurrentDir('');
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 6. Chạy file notPandora.exe
    const isInPandora = currentDir === 'P4nd0r4' || currentDir === 'System/Temp/P4nd0r4';
    const isRunPandoraExe =
      (isInPandora && (
        lowerCmd === './notpandora.exe' ||
        lowerCmd === './notpandora' ||
        lowerCmd === 'notpandora.exe' ||
        lowerCmd === 'notpandora' ||
        lowerCmd === 'wine notpandora.exe' ||
        lowerCmd === 'bash notpandora.exe' ||
        lowerCmd === 'sh notpandora.exe'
      )) ||
      (isPandoraUnlocked && (
        lowerCmd === './p4nd0r4/notpandora.exe' ||
        lowerCmd === 'p4nd0r4/notpandora.exe' ||
        lowerCmd === './system/temp/p4nd0r4/notpandora.exe' ||
        lowerCmd === 'system/temp/p4nd0r4/notpandora.exe' ||
        lowerCmd === './pandora/notpandora.exe' ||
        lowerCmd === 'pandora/notpandora.exe'
      ));

    if (isRunPandoraExe) {
      setIsPandoraModalOpen(true);
      next.push({
        type: 'output',
        content: '[+] Executing notPandora.exe...\n[+] Initializing Rickroll protocol v4.0...\n[+] Launching video payload: Rick Astley — Never Gonna Give You Up 🎵',
      });
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // Đọc file notPandora.exe bằng cat
    if (
      (isInPandora && (
        lowerCmd === 'cat notpandora.exe' ||
        lowerCmd === 'cat ./notpandora.exe' ||
        lowerCmd === 'cat notpandora'
      )) ||
      (isPandoraUnlocked && (
        lowerCmd === 'cat p4nd0r4/notpandora.exe' ||
        lowerCmd === 'cat ./p4nd0r4/notpandora.exe' ||
        lowerCmd === 'cat system/temp/p4nd0r4/notpandora.exe'
      ))
    ) {
      next.push({
        type: 'output',
        content: 'MZ\\x90\\x00\\x03\\x00\\x00\\x00\\x04\\x00\\x00\\x00\\xff\\xff\\x00\\x00 [Binary executable - run with ./notPandora.exe]',
      });
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 7. Chạy file Secret.sh (nằm trong System/Temp)
    const isRunSecret =
      (currentDir === 'System/Temp' && (
        lowerCmd === './secret.sh' ||
        lowerCmd === 'bash secret.sh' ||
        lowerCmd === 'sh secret.sh' ||
        lowerCmd === 'secret.sh' ||
        lowerCmd === './secret' ||
        lowerCmd === 'secret'
      )) ||
      (currentDir === 'System' && (
        lowerCmd === './temp/secret.sh' ||
        lowerCmd === 'bash temp/secret.sh' ||
        lowerCmd === 'sh temp/secret.sh' ||
        lowerCmd === 'temp/secret.sh' ||
        lowerCmd === './temp/secret' ||
        lowerCmd === 'temp/secret'
      )) ||
      lowerCmd === './system/temp/secret.sh' ||
      lowerCmd === 'bash system/temp/secret.sh' ||
      lowerCmd === 'sh system/temp/secret.sh' ||
      lowerCmd === 'system/temp/secret.sh' ||
      lowerCmd === './system/temp/secret' ||
      lowerCmd === 'system/temp/secret';

    if (isRunSecret) {
      if (!isRoot) {
        next.push({ type: 'error', content: 'bash: ./System/Temp/Secret.sh: Permission denied' });
        setLogEntries(next);
        setInputValue('');
        return;
      }
      setIsWaitingFlag(true);
      next.push({ type: 'output', content: 'awaiting input...' });
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // Nếu chạy ./Secret.sh khi chưa vào thư mục System/Temp
    if (
      lowerCmd === './secret.sh' ||
      lowerCmd === 'bash secret.sh' ||
      lowerCmd === 'sh secret.sh' ||
      lowerCmd === 'secret.sh'
    ) {
      next.push({ type: 'error', content: 'bash: ./Secret.sh: No such file or directory' });
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // Xem nội dung file Secret.sh
    const isCatSecret =
      (currentDir === 'System/Temp' && (
        lowerCmd === 'cat secret.sh' ||
        lowerCmd === 'cat ./secret.sh'
      )) ||
      (currentDir === 'System' && (
        lowerCmd === 'cat temp/secret.sh' ||
        lowerCmd === 'cat ./temp/secret.sh'
      )) ||
      lowerCmd === 'cat system/temp/secret.sh' ||
      lowerCmd === 'cat ./system/temp/secret.sh';

    if (isCatSecret) {
      if (!isRoot) {
        next.push({ type: 'error', content: 'cat: System/Temp/Secret.sh: Permission denied' });
        setLogEntries(next);
        setInputValue('');
        return;
      }
      next.push({
        type: 'output',
        content: '#!/bin/bash\necho "awaiting input..."\nread -r flag',
      });
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 8. Lệnh ls (liệt kê danh sách file/thư mục)
    // ls cho System/Temp
    if (
      lowerCmd === 'ls system/temp' ||
      lowerCmd === 'ls system/temp/' ||
      lowerCmd === 'ls -la system/temp' ||
      lowerCmd === 'ls -la system/temp/' ||
      lowerCmd === 'ls -l system/temp' ||
      lowerCmd === 'ls -l system/temp/' ||
      (currentDir === 'System' && (
        lowerCmd === 'ls temp' ||
        lowerCmd === 'ls temp/' ||
        lowerCmd === 'ls -la temp' ||
        lowerCmd === 'ls -la temp/' ||
        lowerCmd === 'ls -l temp' ||
        lowerCmd === 'ls -l temp/'
      ))
    ) {
      if (!isRoot) {
        next.push({
          type: 'error',
          content: "ls: cannot open directory 'System': Permission denied",
        });
      } else {
        next.push({
          type: 'output',
          content: isPandoraUnlocked ? 'P4nd0r4/   Secret.sh' : 'Secret.sh',
        });
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // Liệt kê thư mục P4nd0r4
    if (
      lowerCmd === 'ls p4nd0r4' ||
      lowerCmd === 'ls p4nd0r4/' ||
      lowerCmd === 'ls -la p4nd0r4' ||
      lowerCmd === 'ls -la p4nd0r4/' ||
      lowerCmd === 'ls -l p4nd0r4' ||
      lowerCmd === 'ls -l p4nd0r4/' ||
      lowerCmd === 'ls pandora' ||
      lowerCmd === 'ls pandora/' ||
      lowerCmd === 'ls system/temp/p4nd0r4' ||
      lowerCmd === 'ls system/temp/p4nd0r4/'
    ) {
      if (!isPandoraUnlocked) {
        next.push({
          type: 'error',
          content: "ls: cannot access 'P4nd0r4': No such file or directory",
        });
      } else {
        next.push({
          type: 'output',
          content: 'notPandora.exe',
        });
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // ls cho System
    if (
      lowerCmd === 'ls system' ||
      lowerCmd === 'ls system/' ||
      lowerCmd === 'ls -la system' ||
      lowerCmd === 'ls -la system/' ||
      lowerCmd === 'ls -l system' ||
      lowerCmd === 'ls -l system/'
    ) {
      if (!isRoot) {
        next.push({
          type: 'error',
          content: "ls: cannot open directory 'System': Permission denied",
        });
      } else {
        next.push({
          type: 'output',
          content: 'Temp/   bin/   boot/   etc/   lib/   opt/   root/   sbin/   usr/   var/   kali-config   os-release',
        });
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // Liệt kê thư mục Credentials (ls Credentials)
    if (
      lowerCmd === 'ls credentials' ||
      lowerCmd === 'ls credentials/' ||
      lowerCmd === 'ls -la credentials' ||
      lowerCmd === 'ls -la credentials/' ||
      lowerCmd === 'ls -l credentials' ||
      lowerCmd === 'ls -l credentials/'
    ) {
      if (!isRoot) {
        next.push({
          type: 'error',
          content: "ls: cannot open directory 'Credentials': Permission denied",
        });
      } else {
        next.push({
          type: 'output',
          content: 'p455w0rd.txt',
        });
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // ls thông thường
    if (lowerCmd === 'ls' || lowerCmd === 'ls -la' || lowerCmd === 'ls -l' || lowerCmd === 'dir') {
      if (currentDir === 'Credentials') {
        next.push({
          type: 'output',
          content: 'p455w0rd.txt',
        });
      } else if (isInPandora) {
        next.push({
          type: 'output',
          content: 'notPandora.exe',
        });
      } else if (currentDir === 'System/Temp') {
        next.push({
          type: 'output',
          content: isPandoraUnlocked ? 'P4nd0r4/   Secret.sh' : 'Secret.sh',
        });
      } else if (currentDir === 'System') {
        next.push({
          type: 'output',
          content: 'Temp/   bin/   boot/   etc/   lib/   opt/   root/   sbin/   usr/   var/   kali-config   os-release',
        });
      } else if (isRoot) {
        next.push({
          type: 'output',
          content: isPandoraUnlocked
            ? 'Credentials/   P4nd0r4/   System/   about.txt   courses/   getting-started.txt'
            : 'Credentials/   System/   about.txt   courses/   getting-started.txt',
        });
      } else {
        next.push({
          type: 'output',
          content: isPandoraUnlocked
            ? 'P4nd0r4/   System/   about.txt   courses/   getting-started.txt'
            : 'System/   about.txt   courses/   getting-started.txt',
        });
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 9. Lệnh pwd
    if (lowerCmd === 'pwd') {
      next.push({
        type: 'output',
        content: currentDir ? `/bashlab/${currentDir}` : '/bashlab',
      });
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 10. Lệnh cat đọc file password leet-speak
    const isCatLeetPassword =
      lowerCmd === 'cat credentials/p455w0rd.txt' ||
      lowerCmd === 'cat ./credentials/p455w0rd.txt' ||
      lowerCmd === 'cat credentials/p4ssw0rd.txt' ||
      lowerCmd === 'cat ./credentials/p4ssw0rd.txt' ||
      lowerCmd === 'cat credentials/password.txt' ||
      lowerCmd === 'cat ./credentials/password.txt' ||
      lowerCmd === 'cat credentials/*' ||
      (currentDir === 'Credentials' && (
        lowerCmd === 'cat p455w0rd.txt' ||
        lowerCmd === 'cat p4ssw0rd.txt' ||
        lowerCmd === 'cat password.txt' ||
        lowerCmd === 'cat *'
      )) ||
      (isRoot && (
        lowerCmd === 'cat p455w0rd.txt' ||
        lowerCmd === 'cat p4ssw0rd.txt' ||
        lowerCmd === 'cat password.txt'
      ));

    if (isCatLeetPassword) {
      if (!isRoot) {
        next.push({
          type: 'error',
          content: 'cat: Credentials/p455w0rd.txt: Permission denied',
        });
      } else {
        next.push({
          type: 'output',
          content: 'VUNTe2QxZ19kMzNwXzNuMHVnaF80bmRfeTB1X3cxbGxfZjFuZF8wdTd9',
        });
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 11. Giải mã Base64 (base64 -d)
    if (
      lowerCmd.includes('base64') &&
      (lowerCmd.includes('vunte2qxkmnwcfznumvnafqbmrfyetf1x3cxbglfzjfuzf8wdu09') ||
       lowerCmd.includes('p455w0rd') ||
       lowerCmd.includes('p4ssw0rd') ||
       lowerCmd.includes('password'))
    ) {
      if (!isRoot && (lowerCmd.includes('credentials') || lowerCmd.includes('p455w0rd') || lowerCmd.includes('p4ssw0rd'))) {
        next.push({
          type: 'error',
          content: 'base64: Credentials/p455w0rd.txt: Permission denied',
        });
      } else {
        next.push({
          type: 'output',
          content: 'UCS{d1g_d33p_3n0ugh_4nd_y0u_w1ll_f1nd_0u7}',
        });
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 12. Lệnh whoami
    if (lowerCmd === 'whoami') {
      next.push({ type: 'output', content: isRoot ? 'root' : 'guest' });
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 13. Lệnh ping
    if (lowerCmd === 'ping' || lowerCmd.startsWith('ping ')) {
      const pingPlan = preparePingPlan(cmd);
      if (pingPlan.immediate) {
        next.push({ type: pingPlan.type, content: pingPlan.content });
        setLogEntries(next);
        setInputValue('');
        return;
      }

      setIsPinging(true);
      next.push({ type: 'output', content: pingPlan.header });
      setLogEntries(next);
      setInputValue('');

      let cumulativeDelay = 0;
      const PACKET_INTERVAL = 900;
      const timers = [];

      pingPlan.packets.forEach((packetLine) => {
        cumulativeDelay += PACKET_INTERVAL;
        const t = setTimeout(() => {
          setLogEntries((prev) => [...prev, { type: 'output', content: packetLine }]);
        }, cumulativeDelay);
        timers.push(t);
      });

      cumulativeDelay += 350;
      const finalTimer = setTimeout(() => {
        setLogEntries((prev) => [
          ...prev,
          { type: 'output', content: pingPlan.stats },
        ]);
        setIsPinging(false);
      }, cumulativeDelay);
      timers.push(finalTimer);

      pingTimersRef.current = timers;
      return;
    }

    // 13.5. Lệnh ifconfig (hỗ trợ ifconfig, sudo ifconfig, ifconfig eth0, ifconfig lo, ifconfig -a, v.v.)
    if (
      lowerCmd === 'ifconfig' ||
      lowerCmd.startsWith('ifconfig ') ||
      lowerCmd === 'sudo ifconfig' ||
      lowerCmd.startsWith('sudo ifconfig ')
    ) {
      const ifconfigPlan = prepareIfconfig(cmd, isRoot);
      next.push({ type: ifconfigPlan.type, content: ifconfigPlan.content });
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 14. Lệnh help
    if (lowerCmd === 'help') {
      if (isRoot) {
        next.push({
          type: 'output',
          content: 'Available commands: whoami, ls, pwd, cd, cat, ping, ifconfig, clear, exit, help',
        });
      } else {
        next.push({
          type: 'output',
          content: 'Available demo commands: pwd, ls, whoami, ping google.com, ifconfig, cat about.txt, courses, help, clear',
        });
      }
      setLogEntries(next);
      setInputValue('');
      return;
    }

    // 14. Tra cứu trong bảng RESPONSES
    const hit = RESPONSES[lowerCmd];
    if (hit) {
      next.push({ type: 'output', content: hit.out });
    } else {
      next.push({ type: 'error', content: 'This demo supports a few commands. Type help to see them.' });
    }
    setLogEntries(next);
    setInputValue('');
  }

  const handleTabCompletion = () => {
    if (isWaitingPassword || isWaitingFlag) return;

    const { prefix, token, matches } = getTabCompletions(inputValue, currentDir, isRoot, isPandoraUnlocked);

    if (matches.length === 0) return;

    if (matches.length === 1) {
      const match = matches[0];
      const isDir = match.endsWith('/');
      const completedValue = isDir ? `${prefix}${match}` : `${prefix}${match} `;
      setInputValue(completedValue);
      setTimeout(() => {
        if (termInputRef.current) {
          const len = completedValue.length;
          termInputRef.current.setSelectionRange(len, len);
        }
      }, 0);
      return;
    }

    const commonPrefix = findCommonPrefix(matches);
    if (commonPrefix && commonPrefix.length > token.length) {
      const completedValue = `${prefix}${commonPrefix}`;
      setInputValue(completedValue);
      setTimeout(() => {
        if (termInputRef.current) {
          const len = completedValue.length;
          termInputRef.current.setSelectionRange(len, len);
        }
      }, 0);
      return;
    }

    // In ra danh sách gợi ý vào log terminal giống bash thật
    const promptUser = isRoot ? 'root' : 'guest';
    setLogEntries((prev) => [
      ...prev,
      {
        type: 'prompt',
        cmd: inputValue,
        user: promptUser,
        dir: currentDir,
      },
      {
        type: 'output',
        content: matches.join('   '),
      },
    ]);
  };

  function handleTermKeyDown(e) {
    if (autoRunActiveRef.current) {
      cancelAutoRun();
      setInputValue('');
      setLogEntries([
        { type: 'prompt', cmd: 'ls', user: 'guest', dir: '' },
        { type: 'output', content: 'System/   about.txt   courses/   getting-started.txt' },
        { type: 'prompt', cmd: 'whoami', user: 'guest', dir: '' },
        { type: 'output', content: 'guest' },
      ]);
    }

    if (e.key === 'c' && e.ctrlKey) {
      if (isPinging) {
        e.preventDefault();
        clearPingTimers();
        setInputValue('');
        setLogEntries((prev) => [
          ...prev,
          { type: 'output', content: '^C' },
        ]);
        return;
      }
      if (isWaitingPassword || isWaitingFlag) {
        e.preventDefault();
        setIsWaitingPassword(false);
        setIsWaitingFlag(false);
        setFailedPasswordAttempts(0);
        setInputValue('');
        setLogEntries((prev) => [
          ...prev,
          {
            type: 'prompt',
            promptLabel: isWaitingPassword ? '[sudo] password for guest: ' : '',
            cmd: '^C',
            user: isRoot ? 'root' : 'guest',
            dir: currentDir,
          },
        ]);
        return;
      } else if (inputValue) {
        e.preventDefault();
        const currentVal = inputValue;
        setInputValue('');
        setLogEntries((prev) => [
          ...prev,
          {
            type: 'prompt',
            cmd: `${currentVal}^C`,
            user: isRoot ? 'root' : 'guest',
            dir: currentDir,
          },
        ]);
        return;
      }
    }
    if (e.key === 'Escape') {
      if (isWaitingPassword || isWaitingFlag) {
        e.preventDefault();
        setIsWaitingPassword(false);
        setIsWaitingFlag(false);
        setFailedPasswordAttempts(0);
        setInputValue('');
        setLogEntries((prev) => [
          ...prev,
          {
            type: 'prompt',
            promptLabel: isWaitingPassword ? '[sudo] password for guest: ' : '',
            cmd: '^C',
            user: isRoot ? 'root' : 'guest',
            dir: currentDir,
          },
        ]);
        return;
      }
    }
    // Ctrl+L để clear màn hình chuẩn Linux
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLogEntries([]);
      return;
    }
    // Ctrl+U để xóa dòng đang gõ chuẩn bash
    if (e.key === 'u' && e.ctrlKey) {
      e.preventDefault();
      setInputValue('');
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion();
      return;
    }
    if (e.key === 'Enter') {
      executeCommand(inputValue);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInputValue(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= cmdHistory.length) {
        setHistoryIdx(-1);
        setInputValue('');
      } else {
        setHistoryIdx(nextIdx);
        setInputValue(cmdHistory[nextIdx]);
      }
    }
  }

  const handleTermLogClick = () => {
    if (typeof window !== 'undefined') {
      const sel = window.getSelection();
      if (sel && sel.toString().length > 0) return;
    }
    termInputRef.current?.focus({ preventScroll: true });
  };

  const setSection = (i) => (el) => {
    sectionRefs.current[i] = el;
  };

  const currentQuote = isSecretMode ? SECRET_QUOTE : HERO_QUOTES[quoteIndex];
  const renderedQuote = renderQuoteContent(currentQuote, charCount, typeMode === 'idle');

  return (
    <div className={`${styles.lookbook} ${styles.customBgActive}`}>
      {/* Background Cityscape với lớp tint đen làm nổi bật nội dung */}
      <div className={styles.newBgContainer} aria-hidden="true">
        <video
          autoPlay
          loop
          muted
          playsInline
          className={styles.bgMedia}
          src="/background/pixel-cityscape.1920x1080.mp4"
        />
        <div className={styles.bgDimOverlay} />
      </div>

      {/* ===== 01 / START — Hero giữa (cấu trúc cũ) ===== */}
      <section ref={setSection(0)} id="start" aria-labelledby="hero-heading" className={`${styles.section} ${styles.sHero} ${visibleSections[0] ? styles.isVisible : ''}`}>
        <div className={styles.wrap}>
          <div
            className={`${styles.heroCenter} ${styles.reveal}`}
            onMouseEnter={() => setIsHeroHovered(true)}
            onMouseLeave={() => setIsHeroHovered(false)}
          >
            <button
              type="button"
              className={styles.meteorTrigger}
              aria-label="BashLab — Play meteor shower"
              title="Play meteor shower"
              onClick={(event) => {
                const button = event.currentTarget;
                if (button.getAnimations().some((animation) => animation.playState === 'running')) return;
                button.closest('section').dispatchEvent(new CustomEvent('bashlab:meteors'));
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                  button.animate([{ color: '#78cbd4' }, { color: '#68dfa0' }], { duration: 300 });
                } else {
                  button.animate([
                    { color: '#68dfa0' },
                    { color: '#78cbd4', offset: 0.04 },
                    { color: '#78cbd4', offset: 0.94 },
                    { color: '#68dfa0' },
                  ], { duration: 6500, easing: 'ease-in-out' });
                }
              }}
            >
              <svg width="137.5" height="100" viewBox="0 0 88 64" fill="none" aria-hidden="true">
                <path d="M12 12L36 32L12 52M48 52H76" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 id="hero-heading" className={styles.h1} aria-live="polite">
              <span className={styles.quoteWrapper}>
                <span className={styles.quoteLine}>
                  {renderedQuote.line1Text}
                  {renderedQuote.isLine1Active && (
                    <span
                      className={`${styles.heroCursor} ${typeMode !== 'idle' ? styles.heroCursorTyping : ''}`}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <br />
                <span className={styles.quoteLine}>
                  {renderedQuote.line2Content || '\u00A0'}
                  {renderedQuote.isLine2Active && (
                    <span
                      className={`${styles.heroCursor} ${typeMode !== 'idle' ? styles.heroCursorTyping : ''}`}
                      aria-hidden="true"
                    />
                  )}
                </span>
              </span>
            </h1>
            <p className={styles.body} style={{ maxWidth: 600, textAlign: 'center', marginTop: 14 }}>
              Learn Bash one small step at a time. Try a command, understand what it does, and build confidence through guided practice.
            </p>
            <div className={styles.heroCtas}>
              <Link
                href="/courses"
                className={styles.btnPrimary}
              >
                <span>Start learning</span>
              </Link>
              <button type="button" className={styles.btnSecondary} onClick={() => goTo(1)}>
                <span>Try your first command</span>
              </button>
            </div>
            <p className={styles.heroPwd}>
              <b>$ pwd</b>
              <span>— Start with a simple question: where am I?</span>
            </p>
          </div>
        </div>
      </section>

      {/* ===== 02 / TRY — trái text 40 / phải terminal 60 ===== */}
      <section
        ref={setSection(1)}
        id="try"
        aria-labelledby="try-heading"
        className={`${styles.section} ${styles.sTry} ${visibleSections[1] ? styles.isVisible : ''} ${termSize === 'expanded' ? styles.sTryExpanded : ''}`}
      >
        <div aria-hidden="true" className={styles.tick} style={{ backgroundColor: '#68DFA0' }} />
        <div className={styles.wrap}>
          <div className={styles.tryGrid}>
            <div className={`${styles.tryCol} ${styles.reveal} ${styles.tryIntro}`}>
              <h2 id="try-heading" className={styles.h2}>
                Mastering the terminal,<br />
                <span style={{ color: 'var(--lb-accent)' }}>made effortless.</span>
              </h2>
              <div className={styles.bottomNote}>
                <p className={styles.smallNote}>A safe browser sandbox. No setup, no fear of breaking things — just type and explore.</p>
              </div>
            </div>
            <div className={`${styles.tryCol} ${styles.reveal}`}>
              {termSize === 'closed' ? (
                <div className={styles.termClosed}>
                  <span>Terminal closed — session preserved.</span>
                  <button
                    ref={termReopenRef}
                    type="button"
                    className={styles.termReopen}
                    onClick={() => setTermSize('default')}
                  >
                    <i aria-hidden="true" />
                    Reopen terminal
                  </button>
                </div>
              ) : (
              <>
              {termSize === 'expanded' && (
                <>
                  <div
                    ref={backdropRef}
                    aria-hidden="true"
                    className={styles.termBackdrop}
                    onClick={restoreTerminal}
                  />
                  <div
                    ref={placeholderRef}
                    className={styles.termPlaceholder}
                    style={{ height: inlineHeightRef.current }}
                    aria-hidden="true"
                  />
                </>
              )}
              <div className={styles.termStage}>
                {termSize === 'default' && (
                  <div className={styles.termAura} aria-hidden="true" />
                )}

                <div
                  ref={termRef}
                  className={`${styles.term} ${termSize === 'minimized' ? styles.termMin : ''} ${termSize === 'expanded' ? styles.termMax : ''}`}
                  aria-label="Interactive terminal demo"
                >
                  <div
                    className={`${styles.termGrayOverlay} ${
                      termFadeState === 'gray-in'
                        ? styles.termGrayIn
                        : termFadeState === 'gray-out'
                        ? styles.termGrayOut
                        : ''
                    }`}
                    aria-hidden="true"
                  />

                  <div
                    className={styles.termHead}
                    onClick={(e) => {
                      if (termSize === 'minimized' && !e.target.closest('button')) {
                        setTermSize('default');
                      }
                    }}
                  >
                    <div className={styles.termHeadLeft}>
                      <span className={styles.termDots} role="group" aria-label="Terminal window controls">
                        <button
                          type="button"
                          className={styles.termCtl}
                          title="Close terminal"
                          aria-label="Close terminal (keep session)"
                          onClick={() => {
                            setTermSize('closed');
                            window.requestAnimationFrame(() => termReopenRef.current?.focus({ preventScroll: true }));
                          }}
                        >
                          <span className={styles.termDot} style={{ background: '#ff5f56' }} aria-hidden="true">
                            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                              <path d="M3 3l6 6M9 3l-6 6" />
                            </svg>
                          </span>
                        </button>
                        <button
                          type="button"
                          className={styles.termCtl}
                          title="Minimize"
                          aria-label="Shrink terminal one step (press again to collapse fully)"
                          aria-pressed={termSize === 'minimized'}
                          data-active={termSize === 'minimized'}
                          onClick={() => {
                            /* Thu từng nấc: expanded → default → minimized; minimized → default */
                            if (termSize === 'expanded') {
                              restoreTerminal();
                            } else {
                              setTermSize((prev) => (prev === 'default' ? 'minimized' : 'default'));
                            }
                          }}
                        >
                          <span className={styles.termDot} style={{ background: '#ffbd2e' }} aria-hidden="true">
                            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                              <path d="M2.5 6h7" />
                            </svg>
                          </span>
                        </button>
                        <button
                          ref={termGreenRef}
                          type="button"
                          className={styles.termCtl}
                          title={termSize === 'expanded' ? 'Restore terminal' : 'Expand terminal'}
                          aria-label={termSize === 'expanded' ? 'Restore terminal' : 'Expand terminal'}
                          aria-pressed={termSize === 'expanded'}
                          data-active={termSize === 'expanded'}
                          onClick={() => {
                            if (termSize === 'expanded') {
                              restoreTerminal();
                            } else {
                              expandTerminal();
                            }
                          }}
                        >
                          <span className={styles.termDot} style={{ background: '#27c93f' }} aria-hidden="true">
                            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M7.3 2H10v2.7M10 7.3V10H7.3M4.7 10H2V7.3M2 4.7V2h2.7" />
                            </svg>
                          </span>
                        </button>
                      </span>
                      <span className={isRoot ? styles.termPromptRoot : undefined}>
                        {termSize === 'expanded'
                          ? (isRoot
                              ? (currentDir ? `root@bashlab:~/${currentDir} (bash)` : 'root@bashlab:~ (bash)')
                              : (currentDir ? `guest@bashlab:~/${currentDir} (bash)` : 'guest@bashlab:~ (bash)'))
                          : (isRoot
                              ? (currentDir ? `root@bashlab:~/${currentDir}#` : 'root@bashlab:~#')
                              : (currentDir ? `guest@bashlab:~/${currentDir}$` : 'guest@bashlab:~$'))}
                      </span>
                    </div>
                    <div className={styles.termHeadRight}>
                      <span className={styles.termDemoHint}>
                        {termSize === 'expanded' ? 'Terminal session' : 'Interactive demo'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.termBody} onClick={handleTermLogClick}>
                    <div className={styles.termBodyInner}>
                  <div ref={logRef} className={styles.termLog} role="log" aria-live="polite" aria-label="Terminal output">
                    {logEntries.map((e, i) => {
                      if (e.type === 'prompt') {
                        const isEntryRoot = e.user === 'root';
                        const promptText = typeof e.promptLabel === 'string'
                          ? e.promptLabel
                          : (isEntryRoot
                              ? (e.dir ? `root@bashlab:~/${e.dir}# ` : 'root@bashlab:~# ')
                              : (e.dir ? `guest@bashlab:~/${e.dir}$ ` : 'guest@bashlab:~$ '));
                        return (
                          <div key={i}>
                            <span className={isEntryRoot ? styles.termPromptRoot : styles.termPrompt}>{promptText}</span>{e.cmd ? <span className={styles.termCmd}>{e.cmd}</span> : null}
                          </div>
                        );
                      }
                      if (e.type === 'output') return <div key={i} className={styles.termOut}>{e.content}</div>;
                      if (e.type === 'desc') return <div key={i} className={styles.termDesc}>{e.content}</div>;
                      if (e.type === 'error') return <div key={i} style={{ color: '#ff5f56', paddingLeft: '16px', fontWeight: 600 }}>{e.content}</div>;
                      if (e.type === 'fastfetch') {
                        const isRootFetch = e.user === 'root';
                        return (
                          <div key={i} className={styles.fastfetchWrap}>
                            <pre className={styles.fastfetchArt}>
{`       ..............
     ..,;:ccc,.
   ......''''''..
  .''''''''''''\`
 .'  /\\   /\\    \`'
/==-(  )-(  )-==\\
\\=='   ---    '==/
 \`'-.,,,,,,,.-'\``}
                            </pre>
                            <div className={styles.fastfetchData}>
                              <div className={styles.fastfetchHeader}>
                                <span className={isRootFetch ? styles.termPromptRoot : styles.termPrompt}>
                                  {isRootFetch ? 'root@bashlab' : 'guest@bashlab'}
                                </span>
                              </div>
                              <div className={styles.fastfetchSep}>---------------------------------</div>
                              <div className={styles.fastfetchRow}><span className={styles.fastfetchKey}>OS:</span> <span className={styles.fastfetchVal}>Kali GNU/Linux Rolling x86_64</span></div>
                              <div className={styles.fastfetchRow}><span className={styles.fastfetchKey}>Host:</span> <span className={styles.fastfetchVal}>BashLab Virtual Sandbox</span></div>
                              <div className={styles.fastfetchRow}><span className={styles.fastfetchKey}>Kernel:</span> <span className={styles.fastfetchVal}>6.6.9-kali1-amd64</span></div>
                              <div className={styles.fastfetchRow}><span className={styles.fastfetchKey}>Uptime:</span> <span className={styles.fastfetchVal}>1 hour, 42 mins</span></div>
                              <div className={styles.fastfetchRow}><span className={styles.fastfetchKey}>Packages:</span> <span className={styles.fastfetchVal}>1337 (dpkg)</span></div>
                              <div className={styles.fastfetchRow}><span className={styles.fastfetchKey}>Shell:</span> <span className={styles.fastfetchVal}>bash 5.2.21</span></div>
                              <div className={styles.fastfetchRow}><span className={styles.fastfetchKey}>Terminal:</span> <span className={styles.fastfetchVal}>/dev/pts/0 (web-tty)</span></div>
                              <div className={styles.fastfetchRow}><span className={styles.fastfetchKey}>CPU:</span> <span className={styles.fastfetchVal}>AMD EPYC 7763 (4) @ 2.45GHz</span></div>
                              <div className={styles.fastfetchRow}><span className={styles.fastfetchKey}>GPU:</span> <span className={styles.fastfetchVal}>WebGL 2.0 SwiftShader</span></div>
                              <div className={styles.fastfetchRow}><span className={styles.fastfetchKey}>Memory:</span> <span className={styles.fastfetchVal}>784MiB / 8192MiB (9%)</span></div>
                              <div className={styles.fastfetchRow}><span className={styles.fastfetchKey}>Disk (/):</span> <span className={styles.fastfetchVal}>4.2GiB / 20GiB (21%)</span></div>
                              <div className={styles.fastfetchRow}><span className={styles.fastfetchKey}>Locale:</span> <span className={styles.fastfetchVal}>en_US.UTF-8</span></div>
                              <div className={styles.fastfetchColors} aria-hidden="true">
                                <span style={{ background: '#1c202a' }} />
                                <span style={{ background: '#ff5f56' }} />
                                <span style={{ background: '#68dfa0' }} />
                                <span style={{ background: '#ffbd2e' }} />
                                <span style={{ background: '#38bdf8' }} />
                                <span style={{ background: '#c084fc' }} />
                                <span style={{ background: '#78cbd4' }} />
                                <span style={{ background: '#ffffff' }} />
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return <div key={i} style={{ color: 'var(--lb-faint)' }}>{e.content}</div>;
                    })}

                    {/* Dòng nhập lệnh trực tiếp kiểu Terminal thật */}
                    {!isPinging && (
                      <div className={styles.realTermLine} onClick={(ev) => ev.stopPropagation()}>
                        <span className={`${isWaitingPassword ? styles.termPrompt : (isWaitingFlag ? '' : (isRoot ? styles.termPromptRoot : styles.termPrompt))} ${styles.realTermPrompt}`}>
                          {isWaitingPassword
                            ? '[sudo] password for guest: '
                            : isWaitingFlag
                              ? ''
                              : (isRoot
                                  ? (currentDir ? `root@bashlab:~/${currentDir}# ` : 'root@bashlab:~# ')
                                  : (currentDir ? `guest@bashlab:~/${currentDir}$ ` : 'guest@bashlab:~$ '))}
                        </span>
                        <div className={styles.realTermInputWrapper}>
                          <input
                            ref={termInputRef}
                            type="text"
                            className={styles.realTermInput}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleTermKeyDown}
                            style={
                              isWaitingPassword
                                ? { color: 'transparent', caretColor: 'transparent', userSelect: 'none' }
                                : undefined
                            }
                            spellCheck={false}
                            autoComplete="off"
                            aria-label={
                              isWaitingPassword
                                ? 'Password input'
                                : isWaitingFlag
                                  ? 'Flag input'
                                  : 'Terminal command input'
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                    </div>
                  </div>
                </div>
              </div>
              </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 03 / REVIEWS & SPONSORS ===== */}
      <section ref={setSection(2)} id="reviews" aria-labelledby="reviews-heading" className={`${styles.section} ${styles.sCourse} ${visibleSections[2] ? styles.isVisible : ''}`}>
        <div aria-hidden="true" className={styles.tick} style={{ backgroundColor: '#68DFA0' }} />
        <div className={styles.wrap}>
          <div className={`${styles.reviewsHead} ${styles.reveal}`}>
            <div className={styles.philosophyTag} aria-hidden="true">
              <span>COMMUNITY</span>
              <span className={styles.tagArrow}>&gt;</span>
              <span>STUDENTS</span>
              <span className={styles.tagArrow}>&gt;</span>
              <span>PARTNERS</span>
            </div>
            <h2 id="reviews-heading" className={styles.h2}>Loved by students. Built for future engineers.</h2>
          </div>

          <ReviewsSponsors />
        </div>
      </section>

      {/* ===== 04 / SUBSCRIPTION TEASER ===== */}
      <section ref={setSection(3)} id="pricing" aria-labelledby="pricing-heading" className={`${styles.section} ${styles.sCourse} ${visibleSections[3] ? styles.isVisible : ''}`}>
        <div aria-hidden="true" className={styles.tick} style={{ backgroundColor: '#FFB800' }} />
        <div className={styles.wrap}>
          <SubscriptionTeaser />
        </div>
      </section>

      {/* ===== 05 / QUESTIONS — trái intro 40 / phải accordion 60 ===== */}
      <section ref={setSection(4)} id="questions" aria-labelledby="faq-heading" className={`${styles.section} ${styles.sFaq} ${visibleSections[4] ? styles.isVisible : ''}`}>
        <div aria-hidden="true" className={styles.tick} style={{ backgroundColor: '#78CBD4' }} />
        <div className={styles.wrap}>
          <div className={styles.faqGrid}>
            <div className={styles.reveal}>
              <h2 id="faq-heading" className={styles.h2}>Ready when you are.</h2>
              <p className={styles.body}>
                Zero local configuration, risk-free sandboxes, and tracked completion. Jump into an exercise whenever you are ready to experiment.
              </p>
              <a href="/courses" className={styles.exploreLink}>
                <span>Explore courses</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>
            <div className={`${styles.faqList} ${styles.reveal}`}>
              {FAQS.map((f, i) => (
                <div key={f.q} className={styles.faqItem} data-open={openAcc === i}>
                  <button
                    type="button"
                    className={styles.faqBtn}
                    aria-expanded={openAcc === i}
                    onClick={() => setOpenAcc(openAcc === i ? null : i)}
                  >
                    <span>{f.q}</span>
                    <span className={styles.faqIcon} aria-hidden="true">{openAcc === i ? '−' : '+'}</span>
                  </button>
                  <div className={styles.faqPanel}>
                    <div className={styles.faqInner}><p>{f.a}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Footer isLanding className={styles.faqFooter} />
      </section>

      {/* ===== Right-Rail 28px: dot + divider + toggle một trục ===== */}
      <nav className={styles.rail} aria-label="Lookbook pages">
        <div className={styles.railStack}>
          {PAGES.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={styles.dotWrap}
              aria-label={`Go to ${p.label}`}
              aria-current={active === i}
              onClick={() => goTo(i)}
            >
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.tooltip} aria-hidden="true">{`0${i + 1} · ${p.label}`}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* notPandora.exe Video Modal (Cửa sổ nhỏ phát video Never Gonna Give You Up) */}
      {isPandoraModalOpen && (
        <div className={styles.pandoraModalOverlay} onClick={() => setIsPandoraModalOpen(false)}>
          <div className={styles.pandoraWindow} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="notPandora.exe payload">
            <div className={styles.pandoraTitleBar}>
              <div className={styles.pandoraTitleLeft}>
                <div className={styles.pandoraDots}>
                  <span className={styles.pandoraDotRed} onClick={() => setIsPandoraModalOpen(false)} title="Đóng cửa sổ" />
                  <span className={styles.pandoraDotYellow} title="Thu nhỏ" />
                  <span className={styles.pandoraDotGreen} title="Phóng to" />
                </div>
                <span className={styles.pandoraTitleText}>
                  <span>⚡ notPandora.exe</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>— Active Payload</span>
                </span>
              </div>
              <div className={styles.pandoraTitleActions}>
                <button
                  type="button"
                  className={styles.pandoraPopoutBtn}
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.open('/never-gonna-give-you-up.mp4', 'notPandoraWindow', 'width=640,height=400,resizable=yes');
                    }
                  }}
                  title="Mở trong cửa sổ trình duyệt riêng"
                >
                  ⧉ Pop out
                </button>
                <button
                  type="button"
                  className={styles.pandoraCloseBtn}
                  onClick={() => setIsPandoraModalOpen(false)}
                  aria-label="Đóng cửa sổ"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className={styles.pandoraVideoBody}>
              <video
                ref={pandoraVideoRef}
                src="/never-gonna-give-you-up.mp4"
                autoPlay
                controls
                playsInline
                className={styles.pandoraVideo}
              />
            </div>
            <div className={styles.pandoraFooter}>
              <div className={styles.pandoraStatus}>
                <span className={styles.pandoraStatusPulse} />
                <span>[PAYLOAD EXECUTING] Rick Astley — Never Gonna Give You Up</span>
              </div>
              <button
                type="button"
                className={styles.pandoraPopoutBtn}
                onClick={() => setIsPandoraModalOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}



      <div className={`${styles.toast} ${toast ? styles.toastShow : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
