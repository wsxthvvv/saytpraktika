export const formatRussianPhone = (value = '') => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  let normalized = digits;
  if (normalized.startsWith('8')) {
    normalized = '7' + normalized.slice(1);
  }
  if (!normalized.startsWith('7')) {
    normalized = '7' + normalized;
  }

  normalized = normalized.slice(0, 11);

  const parts = ['+7'];
  if (normalized.length > 1) {
    parts.push(' ' + normalized.slice(1, 4));
  }
  if (normalized.length > 4) {
    parts.push('-' + normalized.slice(4, 7));
  }
  if (normalized.length > 7) {
    parts.push('-' + normalized.slice(7, 9));
  }
  if (normalized.length > 9) {
    parts.push('-' + normalized.slice(9, 11));
  }

  return parts.join('');
};

export const stripPhoneFormatting = (value = '') => value.replace(/\D/g, '');
