import React from "react";
import {
	Animated,
	Pressable as DefaultPressable,
	PressableProps as DefaultPressableProps,
} from "react-native";

export interface PressableProps extends DefaultPressableProps {
	touchFeedback?: boolean;
}

export function Pressable({ children, touchFeedback = true, ...rest }: PressableProps) {
	const animated = new Animated.Value(1);

	const fadeIn = () => {
		Animated.timing(animated, {
			toValue: 0.5,
			duration: 100,
			useNativeDriver: true,
		}).start();
	};
	const fadeOut = () => {
		Animated.timing(animated, {
			toValue: 1,
			duration: 200,
			useNativeDriver: true,
		}).start();
	};

	return (
		<DefaultPressable {...rest} onPressIn={fadeIn} onPressOut={fadeOut}>
			{/* @ts-ignore */}
			<Animated.View style={{ opacity: touchFeedback ? animated : 1 }}>{children}</Animated.View>
		</DefaultPressable>
	);
}
