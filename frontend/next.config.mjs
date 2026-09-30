// Keep WSL and Windows build output separate on the shared /mnt/c checkout.
export default {
  distDir: process.platform === 'win32' ? '.next-win' : '.next-wsl',
};
