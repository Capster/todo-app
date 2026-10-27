export function buildTree(paths: string[]): string {
  const lines: string[] = [];
  const seenDirectories = new Set<string>();
  const sortedPaths = [...paths].sort();

  for (const path of sortedPaths) {
    const parts = path.split('/').filter(part => part.length > 0);

    for (let depth = 0; depth < parts.length - 1; depth += 1) {
      const directoryPath = parts.slice(0, depth + 1).join('/');
      if (!seenDirectories.has(directoryPath)) {
        seenDirectories.add(directoryPath);
        lines.push(`${'  '.repeat(depth)}${parts[depth]}/`);
      }
    }

    const depth = parts.length - 1;
    lines.push(`${'  '.repeat(depth)}${parts[depth]}`);
  }

  return lines.join('\n');
}
