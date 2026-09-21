// terminalTabCompletion.js — Bash-style Tab autocompletion for BashLab terminal

/**
 * Tìm tiền tố chung dài nhất (Longest Common Prefix) từ danh sách chuỗi,
 * so sánh không phân biệt hoa thường nhưng giữ nguyên định dạng chữ hoa/thường chuẩn.
 */
export function findCommonPrefix(strings) {
  if (!strings || strings.length === 0) return '';
  if (strings.length === 1) return strings[0];

  let prefix = strings[0];
  for (let i = 1; i < strings.length; i += 1) {
    const str = strings[i];
    let j = 0;
    while (
      j < prefix.length &&
      j < str.length &&
      prefix[j].toLowerCase() === str[j].toLowerCase()
    ) {
      j += 1;
    }
    prefix = prefix.slice(0, j);
    if (!prefix) break;
  }
  return prefix;
}

/**
 * Lấy danh sách gợi ý tab completion dựa trên input hiện tại, thư mục hiện tại, quyền hạn (guest / root) và trạng thái mở khóa P4nd0r4.
 */
export function getTabCompletions(inputValue, currentDir, isRoot, isPandoraUnlocked = false) {
  const trimmed = inputValue.trimStart();

  // Danh sách lệnh cơ bản
  const baseCommands = isRoot
    ? ['pwd', 'ls', 'whoami', 'help', 'cd', 'cat', 'clear', 'exit', 'base64', 'ping', 'ifconfig']
    : ['pwd', 'ls', 'whoami', 'help', 'cd', 'cat', 'courses', 'clear', 'sudo', 'exit', 'ping', 'ifconfig'];

  // Nếu input trống hoặc chỉ toàn dấu cách: gợi ý toàn bộ câu lệnh có sẵn
  if (!trimmed) {
    return {
      prefix: inputValue,
      token: '',
      matches: baseCommands,
      isCommand: true,
    };
  }

  const lastSpaceIdx = inputValue.lastIndexOf(' ');
  const isFirstWord = lastSpaceIdx === -1;

  const isInPandora = currentDir === 'P4nd0r4' || currentDir === 'System/Temp/P4nd0r4';

  // 1. Tab hoàn thành câu lệnh đầu tiên
  if (isFirstWord) {
    const token = inputValue;
    const candidates = [...baseCommands];

    // Bổ sung các file thực thi trong thư mục hiện tại
    if (isInPandora) {
      candidates.push('./notPandora.exe', 'notPandora.exe');
    } else if (currentDir === 'System/Temp') {
      candidates.push('./Secret.sh', 'bash Secret.sh', 'sh Secret.sh');
      if (isPandoraUnlocked) {
        candidates.push('./P4nd0r4/notPandora.exe');
      }
    } else if (currentDir === 'System') {
      candidates.push('./Temp/Secret.sh');
    } else if (!currentDir) {
      candidates.push('./System/Temp/Secret.sh');
      if (isPandoraUnlocked) {
        candidates.push('./P4nd0r4/notPandora.exe');
      }
    }

    const matches = candidates.filter((c) =>
      c.toLowerCase().startsWith(token.toLowerCase())
    );

    return {
      prefix: '',
      token,
      matches,
      isCommand: true,
    };
  }

  // 2. Tab hoàn thành tham số sau lệnh (cd, cat, ls, bash, sudo, ...)
  const prefix = inputValue.slice(0, lastSpaceIdx + 1);
  const token = inputValue.slice(lastSpaceIdx + 1);

  // Xác định lệnh đầu tiên để gợi ý đúng ngữ cảnh
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
  const subTokens = trimmed.split(/\s+/).slice(1);

  let pool = [];

  if (firstWord === 'sudo') {
    if (subTokens.length <= 1 && !inputValue.endsWith(' su ')) {
      pool = ['su', 'su -', 'su root'];
    } else {
      pool = ['root', 'guest', '-'];
    }
  } else if (firstWord === 'cd') {
    // cd chỉ target thư mục
    if (isInPandora) {
      pool = ['../'];
    } else if (!currentDir) {
      pool = ['System/'];
      if (isRoot) pool.push('Credentials/');
      if (isPandoraUnlocked) pool.push('P4nd0r4/');
    } else if (currentDir === 'System') {
      pool = [
        'Temp/',
        'bin/',
        'boot/',
        'etc/',
        'lib/',
        'opt/',
        'root/',
        'sbin/',
        'usr/',
        'var/',
        '../',
      ];
    } else if (currentDir === 'System/Temp') {
      pool = ['../'];
      if (isPandoraUnlocked) pool.unshift('P4nd0r4/');
    } else if (currentDir === 'Credentials') {
      pool = ['../'];
    }
  } else if (firstWord === 'cat') {
    // cat target files
    if (isInPandora) {
      pool = ['notPandora.exe'];
    } else if (!currentDir) {
      pool = ['about.txt', 'getting-started.txt'];
      if (isRoot) pool.push('Credentials/p455w0rd.txt');
    } else if (currentDir === 'System') {
      pool = ['kali-config', 'os-release', 'Temp/Secret.sh'];
    } else if (currentDir === 'System/Temp') {
      pool = ['Secret.sh'];
    } else if (currentDir === 'Credentials') {
      pool = ['p455w0rd.txt'];
    }
  } else if (firstWord === 'bash' || firstWord === 'sh') {
    if (!currentDir) {
      pool = ['System/Temp/Secret.sh'];
    } else if (currentDir === 'System') {
      pool = ['Temp/Secret.sh'];
    } else if (currentDir === 'System/Temp') {
      pool = ['Secret.sh'];
    }
  } else if (firstWord === 'ping') {
    pool = [];
  } else if (firstWord === 'ifconfig') {
    pool = ['eth0', 'lo', '-a', '-s', '--help'];
  } else {
    // ls hoặc lệnh khác: target cả file và thư mục
    if (isInPandora) {
      pool = ['notPandora.exe'];
    } else if (!currentDir) {
      pool = ['System/', 'about.txt', 'courses/', 'getting-started.txt'];
      if (isPandoraUnlocked) pool.unshift('P4nd0r4/');
      if (isRoot) pool.unshift('Credentials/');
    } else if (currentDir === 'System') {
      pool = [
        'Temp/',
        'bin/',
        'boot/',
        'etc/',
        'lib/',
        'opt/',
        'root/',
        'sbin/',
        'usr/',
        'var/',
        'kali-config',
        'os-release',
      ];
    } else if (currentDir === 'System/Temp') {
      pool = ['Secret.sh'];
      if (isPandoraUnlocked) pool.unshift('P4nd0r4/');
    } else if (currentDir === 'Credentials') {
      pool = ['p455w0rd.txt'];
    }
  }

  // Xử lý các đường dẫn con lồng nhau khi gõ từ thư mục gốc
  const hasDotSlash = token.startsWith('./');
  const pathToken = hasDotSlash ? token.slice(2) : token;
  const lowerPath = pathToken.toLowerCase();

  if (!currentDir) {
    if (lowerPath.startsWith('system/temp/') || lowerPath === 'system/temp') {
      pool = ['System/Temp/Secret.sh'];
      if (isPandoraUnlocked) {
        pool.unshift('System/Temp/P4nd0r4/');
      }
    } else if (
      isPandoraUnlocked &&
      (lowerPath.startsWith('system/temp/p4nd0r4/') || lowerPath === 'system/temp/p4nd0r4')
    ) {
      pool = ['System/Temp/P4nd0r4/notPandora.exe'];
    } else if (
      isPandoraUnlocked &&
      (lowerPath.startsWith('p4nd0r4/') || lowerPath === 'p4nd0r4')
    ) {
      pool = ['P4nd0r4/notPandora.exe'];
    } else if (lowerPath.startsWith('system/') || lowerPath === 'system') {
      const subItems = [
        'Temp/',
        'bin/',
        'boot/',
        'etc/',
        'lib/',
        'opt/',
        'root/',
        'sbin/',
        'usr/',
        'var/',
        'kali-config',
        'os-release',
      ];
      pool = subItems.map((item) => `System/${item}`);
    } else if (
      isRoot &&
      (lowerPath.startsWith('credentials/') || lowerPath === 'credentials')
    ) {
      pool = ['Credentials/p455w0rd.txt'];
    }
  } else if (currentDir === 'System') {
    if (lowerPath.startsWith('temp/') || lowerPath === 'temp') {
      pool = ['Temp/Secret.sh'];
      if (isPandoraUnlocked) {
        pool.unshift('Temp/P4nd0r4/');
      }
    }
  } else if (currentDir === 'System/Temp') {
    if (
      isPandoraUnlocked &&
      (lowerPath.startsWith('p4nd0r4/') || lowerPath === 'p4nd0r4')
    ) {
      pool = ['P4nd0r4/notPandora.exe'];
    }
  }

  let matches = pool.filter((item) => {
    const candidate = hasDotSlash ? `./${item}` : item;
    return candidate.toLowerCase().startsWith(token.toLowerCase());
  });

  if (hasDotSlash) {
    matches = matches.map((m) => (m.startsWith('./') ? m : `./${m}`));
  }

  return {
    prefix,
    token,
    matches,
    isCommand: false,
  };
}
