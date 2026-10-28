import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform } from "react-native";

type UseSheetAnimationOptions = {
  visible: boolean;
  sheetHeight: number;
};

export function useSheetAnimation({
  visible,
  sheetHeight,
}: UseSheetAnimationOptions) {
  const useNativeDriver = Platform.OS !== "web";
  const sheetTranslate = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!visible) {
      sheetTranslate.setValue(sheetHeight);
      backdropOpacity.setValue(0);
      closingRef.current = false;
      setIsClosing(false);
      return;
    }

    closingRef.current = false;
    setIsClosing(false);
    sheetTranslate.setValue(sheetHeight);
    backdropOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver,
      }),
      Animated.timing(sheetTranslate, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
    ]).start();
  }, [
    visible,
    sheetHeight,
    sheetTranslate,
    backdropOpacity,
    useNativeDriver,
  ]);

  function animateOut(then: () => void) {
    if (closingRef.current) {
      return;
    }

    closingRef.current = true;
    setIsClosing(true);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver,
      }),
      Animated.timing(sheetTranslate, {
        toValue: sheetHeight,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver,
      }),
    ]).start(() => {
      closingRef.current = false;
      setIsClosing(false);
      then();
    });
  }

  return {
    isClosing,
    sheetTranslate,
    backdropOpacity,
    animateOut,
  };
}
