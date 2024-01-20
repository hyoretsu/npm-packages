import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as SplashScreen from "expo-splash-screen";
import React, { Dispatch, ReactNode, SetStateAction, useState } from "react";
import { StyleSheet } from "react-native";

export interface VideoSplashProps {
	children: ReactNode;
	/** Set this to true if you're gonna set a 'state' and hide the splash from somewhere else */
	hang?: boolean;
	state?: [boolean, Dispatch<SetStateAction<boolean>>];
	/** An **external** URL to the splash screen video. */
	video: string;
}

SplashScreen.preventAutoHideAsync().catch(() => {
	/* reloading the app might trigger some race conditions, ignore them */
});

export function VideoSplash({ children, hang, state, video: uri }: VideoSplashProps) {
	const localState = useState(false);

	const [lastStatus, setStatus] = useState<AVPlaybackStatus>({} as AVPlaybackStatus);
	const [splashComplete, setSplashComplete] = state ?? localState;

	return (
		<>
			{children}
			{!splashComplete && (
				<Video
					source={{ uri }}
					shouldPlay={!(lastStatus.isLoaded && lastStatus.didJustFinish)}
					isLooping={true}
					onPlaybackStatusUpdate={status => {
						if (status.isLoaded) {
							if (lastStatus.isLoaded !== status.isLoaded) {
								SplashScreen.hideAsync();
							}

							if (status.didJustFinish && !hang) {
								setSplashComplete(true);
							}
						}

						setStatus(() => status);
					}}
					style={StyleSheet.absoluteFill}
					resizeMode={ResizeMode.COVER}
				/>
			)}
		</>
	);
}
