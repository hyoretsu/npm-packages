import { StatusBar, type StatusBarProps, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface BetterStatusBarProps extends StatusBarProps {
	backgroundColor?: string;
}

export function BetterStatusBar({ backgroundColor, ...props }: BetterStatusBarProps) {
	const { top: height } = useSafeAreaInsets();

	return (
		<View style={{ backgroundColor, height }}>
			<StatusBar backgroundColor={backgroundColor} translucent {...props} />
		</View>
	);
}
