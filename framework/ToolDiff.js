export const ToolDiff = {
  diff(oldCode, newCode) {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');

    const max = Math.max(oldLines.length, newLines.length);
    const result = [];

    for (let i = 0; i < max; i++) {
      const o = oldLines[i];
      const n = newLines[i];

      if (o === n) {
        result.push({ type: 'same', value: o ?? '' });
      } else {
        if (o !== undefined) {
          result.push({ type: 'remove', value: o });
        }
        if (n !== undefined) {
          result.push({ type: 'add', value: n });
        }
      }
    }

    return result;
  }
};