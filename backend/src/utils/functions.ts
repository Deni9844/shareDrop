export const getPlatform = (userAgent: string): string => {
    if (/windows/i.test(userAgent)) {
      return 'Windows';
    } else if (/android/i.test(userAgent)) {
      return 'Android';
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      return 'iOS';
    } else if (/macintosh/i.test(userAgent)) {
      return 'MacOS';
    } else {
      return 'Unknown';
    }
  }
  