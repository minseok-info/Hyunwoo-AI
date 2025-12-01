import React from "react";

const checkDoubleClick = (
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
) => {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    return true;
  }

  timerRef.current = setTimeout(() => {
    timerRef.current = null;
  }, 200);

  return false;
}

export default checkDoubleClick;