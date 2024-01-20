import React from "react";
import { StatusBar, StatusBarProps, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface BetterStatusBarProps extends StatusBarProps {
	backgroundColor?: string;
}

export function BetterStatusBar({ backgroundColor, ...props }: BetterStatusBarProps) {
	const { top: height } = useSafeAreaInsets();

	return (
		<View style={{ backgroundColor, height }}>
			<StatusBar translucent backgroundColor={backgroundColor} {...props} />
		</View>
	);
}
