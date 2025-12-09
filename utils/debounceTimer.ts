const debounceTimer = (
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  callback: () => void,
  delay?: number
) => {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  timerRef.current = setTimeout(() => {
    callback();
  }, delay ?? 500);
}

export default debounceTimer;