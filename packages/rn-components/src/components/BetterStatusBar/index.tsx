import React, { PropsWithChildren } from "react";
import { StatusBar, StatusBarProps, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

export interface BetterStatusBarProps extends StatusBarProps {
	backgroundColor?: string;
}

const BetterStatusBarRaw: React.FC<BetterStatusBarProps> = ({ backgroundColor, ...props }) => {
	const { top: height } = useSafeAreaInsets();

	return (
		<View style={{ backgroundColor, height }}>
			<StatusBar translucent backgroundColor={backgroundColor} {...props} />
		</View>
	);
};

export const BetterStatusBar: React.FC<BetterStatusBarProps> = props => (
	<SafeAreaProvider>
		<BetterStatusBarRaw {...props} />
	</SafeAreaProvider>
);
