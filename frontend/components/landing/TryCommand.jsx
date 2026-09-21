'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getTabCompletions, findCommonPrefix } from '@/components/terminalTabCompletion';

const RESPONSES = {
  pwd: {
    out: '/bashlab',
    desc: 'pwd prints your current directory. This path belongs to the demo.',
  },
  ls: {
    out: 'System/   about.txt   courses/   getting-started.txt',
    desc: 'ls lists entries in the demo root.',
  },
  whoami: {
    out: 'guest',
    desc: 'You are a curious learner. BashLab helps you turn that curiosity into command-line skills.',
  },
  help: {
    out: 'Available demo commands: pwd, ls, whoami, ping google.com, ifconfig, cat about.txt, courses, help, clear',
    desc: 'Simulated commands to explore how Bash interaction works.',
  },
  'cat about.txt': {
    out: 'BashLab provides short guided lessons, real browser practice, and requirement feedback.',
    desc: 'Displaying text file contents with cat.',
  },
  'cat getting-started.txt': {
    out: 'Browse courses -> open a course -> choose a lesson -> start practicing.',
    desc: 'Getting started guide loaded.',
  },
  courses: {
    out: 'Shell 101 — Bash Basics [Available now at /courses/shell-101]',
    desc: 'Explore the full course syllabus in the course section below.',
  },
  ifconfig: {
    out: `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.15  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::a00:27ff:fe4e:66a1  prefixlen 64  scopeid 0x20<link>
        ether 08:00:27:4e:66:a1  txqueuelen 1000  (Ethernet)
        RX packets 14205  bytes 12584102 (12.0 MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 8912  bytes 1140921 (1.0 MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 240  bytes 19200 (18.7 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 240  bytes 19200 (18.7 KiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0`,
    desc: 'ifconfig displays network interface configuration and IP addresses.',
  },
};

const SUGGESTED_COMMANDS = ['pwd', 'ls', 'whoami', 'ifconfig', 'help'];

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

export default function TryCommand() {
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
    } catch { }
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
  const [logEntries, setLogEntries] = useState([
    { type: 'info', content: '// Suggested command ready. Click below or press Enter to run:' },
    { type: 'prompt', cmd: 'pwd' },
    { type: 'output', content: '/bashlab' },
    { type: 'desc', content: 'pwd prints your current directory. This path belongs to the demo.' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const pingTimersRef = useRef([]);
  const [isPinging, setIsPinging] = useState(false);
  const clearPingTimers = useCallback(() => {
    pingTimersRef.current.forEach(clearTimeout);
    pingTimersRef.current = [];
    setIsPinging(false);
  }, []);

  useEffect(() => () => {
    clearPingTimers();
  }, [clearPingTimers]);

  const scrollToBottom = () => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logEntries]);

  const executeCommand = (raw) => {
    const cmd = raw.trim();
    if (!cmd && !isWaitingPassword && !isWaitingFlag) return;

    clearPingTimers();

    if (!isWaitingPassword) {
      setCmdHistory((prev) => [...prev, cmd]);
      setHistoryIdx(-1);
    }

    if (isWaitingPassword) {
      const newEntries = [
        ...logEntries,
        { type: 'prompt', promptLabel: '[sudo] password for guest: ', cmd: '', user: 'guest' },
      ];
      if (cmd === 'pwn3d') {
        setIsRoot(true);
        setIsWaitingPassword(false);
        setFailedPasswordAttempts(0);
        setPasswordCooldownUntil(0);
        try {
          sessionStorage.removeItem('bashlab:pwd_cooldown_until');
        } catch { }
        newEntries.push({ type: 'output', content: '[sudo] session opened for root' });
      } else {
        const nextAttempts = failedPasswordAttempts + 1;
        if (nextAttempts < 3) {
          setFailedPasswordAttempts(nextAttempts);
          setIsWaitingPassword(true);
          const left = 3 - nextAttempts;
          newEntries.push({
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
          } catch { }
          newEntries.push({ type: 'error', content: 'sudo: 3 incorrect password attempts' });
          newEntries.push({
            type: 'error',
            content: 'sudo: account locked. Cooldown: 5 minutes.',
          });
        }
      }
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    if (isWaitingFlag) {
      setIsWaitingFlag(false);
      const newEntries = [
        ...logEntries,
        { type: 'prompt', promptLabel: '', cmd, user: isRoot ? 'root' : 'guest', dir: currentDir },
      ];
      const FLAG = 'UCS{d1g_d33p_3n0ugh_4nd_y0u_w1ll_f1nd_0u7}';

      if (cmd === FLAG) {
        setIsPandoraUnlocked(true);
        newEntries.push({
          type: 'output',
          content: 'Unlocked directory: P4nd0r4/',
        });
      } else if (!cmd || cmd.toLowerCase() === 'exit') {
        newEntries.push({ type: 'output', content: 'Secret.sh: aborted.' });
      } else {
        newEntries.push({ type: 'error', content: '[-] Incorrect flag. Try again!' });
      }
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    if (cmd.toLowerCase() === 'clear') {
      setIsWaitingPassword(false);
      setIsWaitingFlag(false);
      setLogEntries(
        isRoot
          ? []
          : [
            {
              type: 'info',
              content: '// Terminal cleared. Type pwd, help, or click a chip:',
            },
          ]
      );
      setInputValue('');
      return;
    }

    const lowerCmd = cmd.toLowerCase();
    const newEntries = [
      ...logEntries,
      { type: 'prompt', cmd, user: isRoot ? 'root' : 'guest', dir: currentDir },
    ];

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
        newEntries.push({ type: 'output', content: 'Already running as root.' });
      } else {
        const remainingMs = passwordCooldownUntil - Date.now();
        if (remainingMs > 0) {
          const totalSec = Math.ceil(remainingMs / 1000);
          const mins = Math.floor(totalSec / 60);
          const secs = totalSec % 60;
          const timeStr = mins > 0 ? `${mins}m ${secs < 10 ? '0' : ''}${secs}s` : `${secs}s`;
          newEntries.push({
            type: 'error',
            content: `sudo: account is locked due to 3 failed attempts. Cooldown active (${timeStr} remaining).`,
          });
        } else {
          setIsWaitingPassword(true);
          setFailedPasswordAttempts(0);
        }
      }
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    if (lowerCmd === 'sudo su pwn3d') {
      const remainingMs = passwordCooldownUntil - Date.now();
      if (remainingMs > 0) {
        const totalSec = Math.ceil(remainingMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        const timeStr = mins > 0 ? `${mins}m ${secs < 10 ? '0' : ''}${secs}s` : `${secs}s`;
        newEntries.push({
          type: 'error',
          content: `sudo: account is locked due to 3 failed attempts. Cooldown active (${timeStr} remaining).`,
        });
      } else {
        setIsRoot(true);
        setFailedPasswordAttempts(0);
        setPasswordCooldownUntil(0);
        try {
          sessionStorage.removeItem('bashlab:pwd_cooldown_until');
        } catch { }
        newEntries.push({ type: 'output', content: '[sudo] session opened for root' });
      }
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

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
      newEntries.push({
        type: 'fastfetch',
        user: fetchUser,
      });
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    if (lowerCmd === 'exit' || lowerCmd === 'logout' || lowerCmd === 'su guest') {
      if (currentDir === 'P4nd0r4' || currentDir === 'System/Temp/P4nd0r4') {
        setCurrentDir(currentDir === 'System/Temp/P4nd0r4' ? 'System/Temp' : '');
        newEntries.push({ type: 'output', content: 'exit' });
      } else if (currentDir === 'System/Temp') {
        setCurrentDir('System');
        newEntries.push({ type: 'output', content: 'exit' });
      } else if (currentDir) {
        setCurrentDir('');
        newEntries.push({ type: 'output', content: 'exit' });
      } else if (isRoot) {
        setIsRoot(false);
        newEntries.push({ type: 'output', content: 'exit' });
      } else {
        newEntries.push({ type: 'output', content: 'exit: session cannot be terminated in demo mode.' });
      }
      setLogEntries(newEntries);
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
      newEntries.push({ type: 'error', content: `bash: cd: ${targetCd}: Permission denied` });
      setLogEntries(newEntries);
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
      newEntries.push({ type: 'error', content: `bash: ${targetExec}: Permission denied` });
      setLogEntries(newEntries);
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
      newEntries.push({ type: 'error', content: `ls: cannot open directory '${targetLs}': Permission denied` });
      setLogEntries(newEntries);
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
        newEntries.push({ type: 'error', content: 'bash: cd: System: Permission denied' });
      } else {
        setCurrentDir('System/Temp');
      }
      setLogEntries(newEntries);
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
        newEntries.push({ type: 'error', content: 'bash: cd: System: Permission denied' });
      } else {
        setCurrentDir('System');
      }
      setLogEntries(newEntries);
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
        newEntries.push({
          type: 'error',
          content: 'bash: cd: Credentials: Permission denied',
        });
      } else {
        setCurrentDir('Credentials');
      }
      setLogEntries(newEntries);
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
        newEntries.push({ type: 'error', content: 'bash: cd: P4nd0r4: No such file or directory' });
      } else {
        setCurrentDir(currentDir.startsWith('System') ? 'System/Temp/P4nd0r4' : 'P4nd0r4');
      }
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    if (
      (currentDir === 'P4nd0r4' || currentDir === 'System/Temp/P4nd0r4') &&
      (lowerCmd === 'cd ..' || lowerCmd === 'cd ../')
    ) {
      setCurrentDir(currentDir === 'System/Temp/P4nd0r4' ? 'System/Temp' : '');
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    if (
      currentDir === 'System/Temp' &&
      (lowerCmd === 'cd ..' || lowerCmd === 'cd ../')
    ) {
      setCurrentDir('System');
      setLogEntries(newEntries);
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
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    // Chạy file notPandora.exe
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
      newEntries.push({
        type: 'output',
        content: '[+] Executing notPandora.exe...\n[+] Initializing Rickroll protocol v4.0...\n[+] Launching video payload: Rick Astley — Never Gonna Give You Up 🎵',
      });
      setLogEntries(newEntries);
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
      newEntries.push({
        type: 'output',
        content: 'MZ\\x90\\x00\\x03\\x00\\x00\\x00\\x04\\x00\\x00\\x00\\xff\\xff\\x00\\x00 [Binary executable - run with ./notPandora.exe]',
      });
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    // Chạy file Secret.sh (nằm trong System/Temp)
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
        newEntries.push({ type: 'error', content: 'bash: ./System/Temp/Secret.sh: Permission denied' });
        setLogEntries(newEntries);
        setInputValue('');
        return;
      }
      setIsWaitingFlag(true);
      newEntries.push({ type: 'output', content: 'awaiting input...' });
      setLogEntries(newEntries);
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
      newEntries.push({ type: 'error', content: 'bash: ./Secret.sh: No such file or directory' });
      setLogEntries(newEntries);
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
        newEntries.push({ type: 'error', content: 'cat: System/Temp/Secret.sh: Permission denied' });
        setLogEntries(newEntries);
        setInputValue('');
        return;
      }
      newEntries.push({
        type: 'output',
        content: '#!/bin/bash\necho "awaiting input..."\nread -r flag',
      });
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

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
        newEntries.push({
          type: 'error',
          content: "ls: cannot open directory 'System': Permission denied",
        });
      } else {
        newEntries.push({
          type: 'output',
          content: isPandoraUnlocked ? 'P4nd0r4/   Secret.sh' : 'Secret.sh',
        });
      }
      setLogEntries(newEntries);
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
        newEntries.push({
          type: 'error',
          content: "ls: cannot access 'P4nd0r4': No such file or directory",
        });
      } else {
        newEntries.push({
          type: 'output',
          content: 'notPandora.exe',
        });
      }
      setLogEntries(newEntries);
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
        newEntries.push({
          type: 'error',
          content: "ls: cannot open directory 'System': Permission denied",
        });
      } else {
        newEntries.push({
          type: 'output',
          content: 'Temp/   bin/   boot/   etc/   lib/   opt/   root/   sbin/   usr/   var/   kali-config   os-release',
        });
      }
      setLogEntries(newEntries);
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
        newEntries.push({
          type: 'error',
          content: "ls: cannot open directory 'Credentials': Permission denied",
        });
      } else {
        newEntries.push({
          type: 'output',
          content: 'p455w0rd.txt',
        });
      }
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    // ls thông thường
    if (lowerCmd === 'ls' || lowerCmd === 'ls -la' || lowerCmd === 'ls -l' || lowerCmd === 'dir') {
      if (currentDir === 'Credentials') {
        newEntries.push({
          type: 'output',
          content: 'p455w0rd.txt',
        });
      } else if (isInPandora) {
        newEntries.push({
          type: 'output',
          content: 'notPandora.exe',
        });
      } else if (currentDir === 'System/Temp') {
        newEntries.push({
          type: 'output',
          content: isPandoraUnlocked ? 'P4nd0r4/   Secret.sh' : 'Secret.sh',
        });
      } else if (currentDir === 'System') {
        newEntries.push({
          type: 'output',
          content: 'Temp/   bin/   boot/   etc/   lib/   opt/   root/   sbin/   usr/   var/   kali-config   os-release',
        });
      } else if (isRoot) {
        newEntries.push({
          type: 'output',
          content: isPandoraUnlocked
            ? 'Credentials/   P4nd0r4/   System/   about.txt   courses/   getting-started.txt'
            : 'Credentials/   System/   about.txt   courses/   getting-started.txt',
        });
      } else {
        newEntries.push({
          type: 'output',
          content: isPandoraUnlocked
            ? 'P4nd0r4/   System/   about.txt   courses/   getting-started.txt'
            : 'System/   about.txt   courses/   getting-started.txt',
        });
        newEntries.push({
          type: 'desc',
          content: 'ls lists entries in the demo root.',
        });
      }
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    if (lowerCmd === 'pwd') {
      newEntries.push({
        type: 'output',
        content: currentDir ? `/bashlab/${currentDir}` : '/bashlab',
      });
      if (!isRoot) {
        newEntries.push({
          type: 'desc',
          content: 'pwd prints your current working directory.',
        });
      }
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

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
        newEntries.push({
          type: 'error',
          content: 'cat: Credentials/p455w0rd.txt: Permission denied',
        });
      } else {
        newEntries.push({
          type: 'output',
          content: 'VUNTe2QxZ19kMzNwXzNuMHVnaF80bmRfeTB1X3cxbGxfZjFuZF8wdTd9',
        });
      }
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    if (
      lowerCmd.includes('base64') &&
      (lowerCmd.includes('vunte2qxkmnwcfznumvnafqbmrfyetf1x3cxbglfzjfuzf8wdu09') ||
        lowerCmd.includes('p455w0rd') ||
        lowerCmd.includes('p4ssw0rd') ||
        lowerCmd.includes('password'))
    ) {
      if (!isRoot && (lowerCmd.includes('credentials') || lowerCmd.includes('p455w0rd') || lowerCmd.includes('p4ssw0rd'))) {
        newEntries.push({
          type: 'error',
          content: 'base64: Credentials/p455w0rd.txt: Permission denied',
        });
      } else {
        newEntries.push({
          type: 'output',
          content: 'UCS{d1g_d33p_3n0ugh_4nd_y0u_w1ll_f1nd_0u7}',
        });
      }
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    if (lowerCmd === 'whoami') {
      if (isRoot) {
        newEntries.push({ type: 'output', content: 'root' });
      } else {
        newEntries.push({ type: 'output', content: 'guest' });
        newEntries.push({ type: 'desc', content: 'You are a curious learner. BashLab helps you turn that curiosity into command-line skills.' });
      }
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    if (lowerCmd === 'ping' || lowerCmd.startsWith('ping ')) {
      const pingPlan = preparePingPlan(cmd);
      if (pingPlan.immediate) {
        newEntries.push({ type: pingPlan.type, content: pingPlan.content });
        if (!isRoot && pingPlan.desc) {
          newEntries.push({ type: 'desc', content: pingPlan.desc });
        }
        setLogEntries(newEntries);
        setInputValue('');
        return;
      }

      setIsPinging(true);
      newEntries.push({ type: 'output', content: pingPlan.header });
      setLogEntries(newEntries);
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
        setLogEntries((prev) => {
          const updated = [
            ...prev,
            { type: 'output', content: pingPlan.stats },
          ];
          if (!isRoot && pingPlan.desc) {
            updated.push({ type: 'desc', content: pingPlan.desc });
          }
          return updated;
        });
        setIsPinging(false);
      }, cumulativeDelay);
      timers.push(finalTimer);

      pingTimersRef.current = timers;
      return;
    }

    if (
      lowerCmd === 'ifconfig' ||
      lowerCmd.startsWith('ifconfig ') ||
      lowerCmd === 'sudo ifconfig' ||
      lowerCmd.startsWith('sudo ifconfig ')
    ) {
      const ifconfigPlan = prepareIfconfig(cmd, isRoot);
      newEntries.push({ type: ifconfigPlan.type, content: ifconfigPlan.content });
      if (!isRoot && ifconfigPlan.desc) {
        newEntries.push({ type: 'desc', content: ifconfigPlan.desc });
      }
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    if (lowerCmd === 'help') {
      if (isRoot) {
        newEntries.push({
          type: 'output',
          content: 'Available commands: whoami, ls, pwd, cd, cat, ping, ifconfig, clear, exit, help, base64',
        });
      } else {
        newEntries.push({
          type: 'output',
          content: 'Available demo commands: pwd, ls, whoami, ping, ifconfig, cat, courses, help, clear',
        });
        newEntries.push({
          type: 'desc',
          content: 'Simulated commands to explore how Bash interaction works.',
        });
      }
      setLogEntries(newEntries);
      setInputValue('');
      return;
    }

    const resObj = RESPONSES[lowerCmd];
    if (resObj) {
      newEntries.push({ type: 'output', content: resObj.out });
      if (!isRoot) {
        newEntries.push({ type: 'desc', content: resObj.desc });
      }
    } else {
      newEntries.push({
        type: 'error',
        content: 'This demo supports a few commands. Type help to see them.',
      });
    }

    setLogEntries(newEntries);
    setInputValue('');
  };

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
        if (inputRef.current) {
          const len = completedValue.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 0);
      return;
    }

    const commonPrefix = findCommonPrefix(matches);
    if (commonPrefix && commonPrefix.length > token.length) {
      const completedValue = `${prefix}${commonPrefix}`;
      setInputValue(completedValue);
      setTimeout(() => {
        if (inputRef.current) {
          const len = completedValue.length;
          inputRef.current.setSelectionRange(len, len);
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

  const handleKeyDown = (e) => {
    if ((e.key === 'c' && e.ctrlKey) || e.key === 'Escape') {
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
      }
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
  };

  const handleChipClick = (cmd) => {
    executeCommand(cmd);
  };

  const handleClear = () => {
    executeCommand('clear');
  };

  const handleRunClick = () => {
    executeCommand(inputValue);
  };

  return (
    <section
      id="first-command"
      className="relative bg-[#141820] py-14 sm:py-16 border-t"
      style={{ borderColor: '#39434F' }}
      aria-labelledby="try-heading"
    >
      <div className="section-divider" style={{ backgroundColor: '#00FF66' }} aria-hidden="true" />

      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div>
              <h2
                id="try-heading"
                className="heading-lg mb-4"
              >
                Ask the terminal where you are.
              </h2>
              <p className="body-md max-w-[480px]">
                In the command line, every file you view and script you run depends on your current directory. Asking{' '}
                <code className="code-inline">pwd</code> (print working directory) gives you your immediate bearings before making changes.
              </p>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="font-code text-xs sm:text-sm text-outline leading-relaxed">
                You have seen a command. Next, learn when and why to use it.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="w-full max-w-[640px] rounded-xl border border-white/10 bg-[#0B0F17] shadow-2xl overflow-hidden text-left ml-auto">
              <div className="px-4 py-2.5 bg-[#121622] border-b border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/70 shrink-0" aria-hidden="true" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/70 shrink-0" aria-hidden="true" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/70 shrink-0" aria-hidden="true" />
                  <span className={`ml-2 font-code text-xs truncate ${isRoot ? 'text-[#ff5f56]' : 'text-on-surface-variant'}`}>
                    {isRoot
                      ? (currentDir ? `root@bashlab:~/${currentDir}#` : 'root@bashlab:~#')
                      : (currentDir ? `guest@bashlab:~/${currentDir}$` : 'guest@bashlab:~$')}
                  </span>
                </div>
                <span className="font-code text-[11px] text-outline hidden sm:block shrink-0">Interactive demo — simulated commands, no real shell</span>
              </div>

              <div
                ref={logRef}
                className="p-5 font-code text-xs space-y-3 min-h-[170px] max-h-[260px] overflow-y-auto"
                role="log"
                aria-live="polite"
                aria-label="Terminal output"
              >
                {logEntries.map((entry, index) => (
                  <div
                    key={index}
                    className={`${entry.type === 'prompt' ? 'flex items-start gap-2 text-white' : ''} ${entry.type === 'output' ? 'pl-4 text-on-surface font-semibold text-white/90' : ''} ${entry.type === 'desc' ? 'pl-4 text-[11px] text-on-surface-variant border-l-2 leading-relaxed py-0.5' : ''} ${entry.type === 'error' ? 'pl-4 text-xs text-[#ff5f56] font-semibold' : ''} ${entry.type === 'info' ? 'text-outline' : ''}`}
                    style={{
                      borderLeftColor: entry.type === 'desc' ? 'rgba(0, 255, 102, 0.4)' : 'transparent',
                    }}
                  >
                    {entry.type === 'prompt' ? (
                      <>
                        <span className={`font-semibold whitespace-pre ${entry.user === 'root' ? 'text-[#ff5f56]' : 'text-secondary'}`}>{typeof entry.promptLabel === 'string'
                          ? entry.promptLabel
                          : (entry.user === 'root'
                            ? (entry.dir ? `root@bashlab:~/${entry.dir}# ` : 'root@bashlab:~# ')
                            : (entry.dir ? `guest@bashlab:~/${entry.dir}$ ` : 'guest@bashlab:~$ '))}</span>{entry.cmd ? <span className="text-primary font-bold">{entry.cmd}</span> : null}
                      </>
                    ) : entry.type === 'fastfetch' ? (
                      <div className="flex flex-wrap items-start gap-6 font-mono text-xs py-2">
                        <pre className="text-secondary font-bold select-none leading-tight drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
                          {`       ..............
     ..,;:ccc,.
   ......''''''..
  .''''''''''''\`
 .'  /\\   /\\    \`'
/==-(  )-(  )-==\\
\\=='   ---    '==/
 \`'-.,,,,,,,.-'\``}
                        </pre>
                        <div className="flex flex-col text-xs leading-relaxed space-y-0.5">
                          <div className="font-bold text-sm">
                            <span className={entry.user === 'root' ? 'text-[#ff5f56]' : 'text-secondary'}>
                              {entry.user === 'root' ? 'root@bashlab' : 'guest@bashlab'}
                            </span>
                          </div>
                          <div className="text-white/30 text-[11px]">---------------------------------</div>
                          <div><span className="text-secondary font-bold inline-block min-w-[80px]">OS:</span> <span className="text-gray-300">Kali GNU/Linux Rolling x86_64</span></div>
                          <div><span className="text-secondary font-bold inline-block min-w-[80px]">Host:</span> <span className="text-gray-300">BashLab Virtual Sandbox</span></div>
                          <div><span className="text-secondary font-bold inline-block min-w-[80px]">Kernel:</span> <span className="text-gray-300">6.6.9-kali1-amd64</span></div>
                          <div><span className="text-secondary font-bold inline-block min-w-[80px]">Uptime:</span> <span className="text-gray-300">1 hour, 42 mins</span></div>
                          <div><span className="text-secondary font-bold inline-block min-w-[80px]">Packages:</span> <span className="text-gray-300">1337 (dpkg)</span></div>
                          <div><span className="text-secondary font-bold inline-block min-w-[80px]">Shell:</span> <span className="text-gray-300">bash 5.2.21</span></div>
                          <div><span className="text-secondary font-bold inline-block min-w-[80px]">Terminal:</span> <span className="text-gray-300">/dev/pts/0 (web-tty)</span></div>
                          <div><span className="text-secondary font-bold inline-block min-w-[80px]">CPU:</span> <span className="text-gray-300">AMD EPYC 7763 (4) @ 2.45GHz</span></div>
                          <div><span className="text-secondary font-bold inline-block min-w-[80px]">GPU:</span> <span className="text-gray-300">WebGL 2.0 SwiftShader</span></div>
                          <div><span className="text-secondary font-bold inline-block min-w-[80px]">Memory:</span> <span className="text-gray-300">784MiB / 8192MiB (9%)</span></div>
                          <div><span className="text-secondary font-bold inline-block min-w-[80px]">Disk (/):</span> <span className="text-gray-300">4.2GiB / 20GiB (21%)</span></div>
                          <div><span className="text-secondary font-bold inline-block min-w-[80px]">Locale:</span> <span className="text-gray-300">en_US.UTF-8</span></div>
                          <div className="flex gap-1.5 pt-2" aria-hidden="true">
                            <span className="w-4 h-3.5 rounded-sm bg-[#1c202a] inline-block" />
                            <span className="w-4 h-3.5 rounded-sm bg-[#ff5f56] inline-block" />
                            <span className="w-4 h-3.5 rounded-sm bg-[#00ff66] inline-block" />
                            <span className="w-4 h-3.5 rounded-sm bg-[#ffbd2e] inline-block" />
                            <span className="w-4 h-3.5 rounded-sm bg-[#38bdf8] inline-block" />
                            <span className="w-4 h-3.5 rounded-sm bg-[#c084fc] inline-block" />
                            <span className="w-4 h-4 rounded-sm bg-[#00e5ff] inline-block" />
                            <span className="w-4 h-3.5 rounded-sm bg-[#ffffff] inline-block" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      entry.content
                    )}
                  </div>
                ))}
              </div>

              {!isPinging && (
                <div className="px-4 py-2 bg-[#0E121C] border-t border-white/10 flex items-center gap-0">
                  <span className={`font-semibold shrink-0 whitespace-pre ${isWaitingPassword ? 'text-secondary' : (isWaitingFlag ? '' : (isRoot ? 'text-[#ff5f56]' : 'text-secondary'))}`}>
                    {isWaitingPassword
                      ? '[sudo] password for guest: '
                      : (isWaitingFlag
                        ? ''
                        : (isRoot
                          ? (currentDir ? `root@bashlab:~/${currentDir}# ` : 'root@bashlab:~# ')
                          : (currentDir ? `guest@bashlab:~/${currentDir}$ ` : 'guest@bashlab:~$ ')))}
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={
                      isWaitingPassword
                        ? { color: 'transparent', caretColor: 'transparent', userSelect: 'none' }
                        : undefined
                    }
                    placeholder={
                      isWaitingPassword || isWaitingFlag || isRoot
                        ? ''
                        : 'Type pwd, ls, whoami, ifconfig, help...'
                    }
                    spellCheck={false}
                    autoComplete="off"
                    className="w-full bg-transparent border-0 p-0 text-white font-code text-xs focus:ring-0 focus:outline-none placeholder:text-outline/50"
                    id="cmd-input"
                    aria-label={
                      isWaitingPassword
                        ? 'Password input'
                        : (isWaitingFlag
                          ? 'Flag input'
                          : 'Command input')
                    }
                  />
                  <button
                    onClick={handleRunClick}
                    className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-code text-[11px] uppercase tracking-wider shrink-0 transition-colors focus-visible"
                    type="button"
                    aria-label="Run command"
                  >
                    {isWaitingPassword || isWaitingFlag ? 'SUBMIT' : 'RUN'}
                  </button>
                </div>
              )}

              {!isPinging && (
                <div className="px-4 py-2.5 bg-[#090C12] border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Suggested commands">
                    {SUGGESTED_COMMANDS.map((cmd) => (
                      <button
                        key={cmd}
                        disabled={isWaitingPassword || isWaitingFlag}
                        onClick={() => handleChipClick(cmd)}
                        className={`chip ${cmd === 'pwd' ? 'chip-primary' : 'chip-ghost'}`}
                        style={{
                          borderColor: cmd === 'pwd' ? 'rgba(0, 255, 102, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                          backgroundColor: cmd === 'pwd' ? 'rgba(0, 255, 102, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        }}
                        aria-label={`Run ${cmd} command`}
                      >
                        {cmd === 'pwd' && (
                          <>
                            <span className="material-symbols-outlined text-sm">play_arrow</span>
                            <span>Run demo command: {cmd}</span>
                          </>
                        )}
                        {cmd !== 'pwd' && cmd}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleClear}
                    disabled={isWaitingPassword || isWaitingFlag}
                    className="text-outline hover:text-white font-code text-[11px] uppercase tracking-wider transition-colors focus-visible"
                    type="button"
                    aria-label="Clear terminal"
                  >
                    CLEAR
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* notPandora.exe Video Modal */}
      {isPandoraModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsPandoraModalOpen(false)}
        >
          <div
            className="w-full max-w-[620px] bg-[#080d1a] border border-[#00ff66]/40 rounded-xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_30px_rgba(0,255,102,0.2)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="notPandora.exe payload"
          >
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/[0.04] border-b border-white/[0.08] select-none">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => setIsPandoraModalOpen(false)}
                    title="Đóng cửa sổ"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" title="Thu nhỏ" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" title="Phóng to" />
                </div>
                <span className="font-mono text-xs font-bold text-[#00ff66] tracking-wider ml-1 flex items-center gap-1.5">
                  <span>⚡ notPandora.exe</span>
                  <span className="text-white/40 font-normal">— Active Payload</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="bg-white/10 text-gray-300 border border-white/15 rounded px-2 py-0.5 font-mono text-[10px] hover:bg-[#00e5ff]/20 hover:text-[#00e5ff] hover:border-[#00e5ff]/40 transition-colors"
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
                  className="text-gray-400 hover:text-[#ff5f56] hover:bg-[#ff5f56]/20 rounded w-6 h-6 flex items-center justify-center text-sm transition-colors"
                  onClick={() => setIsPandoraModalOpen(false)}
                  aria-label="Đóng cửa sổ"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="relative w-full bg-black aspect-video flex items-center justify-center">
              <video
                ref={pandoraVideoRef}
                src="/never-gonna-give-you-up.mp4"
                autoPlay
                controls
                playsInline
                className="w-full h-full object-contain block"
              />
            </div>
            <div className="flex items-center justify-between px-3.5 py-2 bg-white/[0.02] border-t border-white/[0.06] font-mono text-[10.5px] text-gray-400">
              <div className="flex items-center gap-2 text-[#00ff66]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66] animate-pulse" />
                <span>[PAYLOAD EXECUTING] Rick Astley — Never Gonna Give You Up</span>
              </div>
              <button
                type="button"
                className="bg-white/10 hover:bg-white/20 text-white rounded px-2 py-0.5 text-xs transition-colors"
                onClick={() => setIsPandoraModalOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}