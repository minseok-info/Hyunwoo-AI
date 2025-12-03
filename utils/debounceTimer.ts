const debounceTimer = (
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  callback: () => void
) => {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  timerRef.current = setTimeout(() => {
    callback();
  }, 500);
}

export default debounceTimer;