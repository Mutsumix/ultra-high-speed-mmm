import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from 'react-native-elements';
import { GameScreen } from './src/screens/GameScreen';
import { GameResultScreen } from './src/screens/GameResultScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  Game: undefined;
  GameResult: { count: number };
};

type MainScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type MainScreenProps = {
  navigation: MainScreenNavigationProp;
};

const Stack = createStackNavigator<RootStackParamList>();

function MainScreen({ navigation }: MainScreenProps) {
  const { width, height } = useWindowDimensions();
  const [isLandscape, setIsLandscape] = useState(width > height);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const videoId = 'zjB4PPgBtSo';

  const speeds = [0.5, 1, 2];

  const [lastPosition, setLastPosition] = useState(0);
  const [webViewKey, setWebViewKey] = useState(0);
  const [isLoopMode, setIsLoopMode] = useState(false);

  useEffect(() => {
    // 画面の向きの変更を監視
    const subscription = ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
      const { orientation } = orientationInfo;
      setIsLandscape(
        orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
      );
    });

    // 画面の向きを許可
    ScreenOrientation.unlockAsync();

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, []);

  const changeSpeed = (speed: number) => {
    setCurrentSpeed(speed);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        player.setPlaybackRate(${speed});
        true;
      `);
    }
  };

  const restartVideo = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        player.seekTo(0);
        player.playVideo();
        true;
      `);
    }
  };

  const webViewRef = React.useRef<WebView>(null);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: 0;
          }
        </style>
      </head>
      <body>
        <iframe
          id="player"
          src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&rel=0"
          frameborder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
        <script src="https://www.youtube.com/iframe_api"></script>
        <script>
          var player;
          function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
              events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
              }
            });
          }
          function onPlayerReady(event) {
            // プレイヤーの準備完了を通知
            window.ReactNativeWebView.postMessage('PLAYER_READY');
          }
          function onPlayerStateChange(event) {
            // 再生位置を1秒ごとに保存
            if (event.data === 1) { // 再生中
              setInterval(() => {
                window.ReactNativeWebView.postMessage(player.getCurrentTime().toString());
              }, 1000);
            } else if (event.data === 0) { // 再生終了
              window.ReactNativeWebView.postMessage('VIDEO_ENDED');
            }
          }
        </script>
      </body>
    </html>
  `;

  // メッセージハンドラーを更新
  const onMessage = (event: any) => {
    const data = event.nativeEvent.data;
    if (data === 'PLAYER_READY') {
      // プレイヤーの準備完了時に再生速度を設定して再生開始
      webViewRef.current?.injectJavaScript(`
        player.setPlaybackRate(${currentSpeed});
        player.playVideo();
        true;
      `);
    } else if (data === 'VIDEO_ENDED' && isLoopMode) {
      // ループモード時は最初から再生
      restartFromBeginning();
    } else {
      // 既存の再生位置の保存処理
      setLastPosition(parseFloat(data));
    }
  };

  // 最初から再生
  const restartFromBeginning = () => {
    // 再生位置のみリセット
    setLastPosition(0);

    // WebViewを強制的に再マウント
    if (webViewRef.current) {
      webViewRef.current.reload();
      // キーを変更してWebViewを強制的に再レンダリング
      setWebViewKey(prev => prev + 1);
    }
  };

  // WebViewがロードされた後に再生速度を設定し、再生を開始
  useEffect(() => {
    if (webViewRef.current) {
      // プレイヤーの初期化を待ってから実行
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(`
          if (player && player.setPlaybackRate) {
            player.setPlaybackRate(${currentSpeed});
            player.playVideo(); // 再生を開始
          }
          true;
        `);
      }, 1000); // 1秒待機
    }
  }, [webViewKey]);

  // 続きから再生
  const resumeFromLastPosition = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        player.seekTo(${lastPosition});
        player.playVideo();
        true;
      `);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.content, isLandscape && styles.contentLandscape]}>
        <View style={[styles.videoContainer, isLandscape && styles.videoContainerLandscape]}>
          <WebView
            key={webViewKey}
            ref={webViewRef}
            source={{ html: htmlContent }}
            style={styles.webview}
            javaScriptEnabled={true}
            allowsFullscreenVideo={true}
            onMessage={onMessage}
          />
        </View>
        <View style={[styles.controlsContainer, isLandscape && styles.controlsContainerLandscape]}>
          <Text style={styles.title}>再生速度</Text>
          <View style={[styles.controls, isLandscape && styles.controlsLandscape]}>
            {speeds.map((speed) => (
              <TouchableOpacity
                key={speed}
                style={[
                  styles.button,
                  currentSpeed === speed && styles.activeButton,
                  isLandscape && styles.buttonLandscape
                ]}
                onPress={() => changeSpeed(speed)}
              >
                <Text style={[
                  styles.buttonText,
                  currentSpeed === speed && styles.activeButtonText
                ]}>
                  {speed}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.buttonGroup, isLandscape && { flexDirection: 'column', gap: 8 }]}>
            <TouchableOpacity
              style={[styles.controlButton, styles.restartButton, isLandscape && styles.controlButtonLandscape]}
              onPress={restartFromBeginning}
            >
              <Text style={[styles.controlButtonText, styles.restartButtonText]}>最初から再生</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, styles.resumeButton, isLandscape && styles.controlButtonLandscape]}
              onPress={resumeFromLastPosition}
            >
              <Text style={styles.controlButtonText}>続きから再生</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.loopButton, isLoopMode && styles.loopButtonActive]}
            onPress={() => setIsLoopMode(!isLoopMode)}
          >
            <MaterialIcons name="loop" size={20} color="#FFF" />
          </TouchableOpacity>
          <Button
            title="餅つきゲームで遊ぶ"
            onPress={() => navigation.navigate('Game')}
            containerStyle={styles.gameButton}
            buttonStyle={styles.gameButtonStyle}
            titleStyle={styles.controlButtonText}
          />
        </View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff', // タイトルとバックボタンの色を白に
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={MainScreen}
          options={{ title: '餅つき動画' }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{
            title: '餅つきゲーム',
            headerStyle: {
              backgroundColor: '#fff', // ゲーム画面は白背景
            },
            headerTintColor: '#000', // ゲーム画面は黒文字
          }}
        />
        <Stack.Screen
          name="GameResult"
          component={GameResultScreen}
          options={{
            title: 'ゲーム結果',
            headerStyle: {
              backgroundColor: '#fff', // 結果画面も白背景
            },
            headerTintColor: '#000', // 結果画面も黒文字
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    flexDirection: 'column',
    padding: 20,
    width: '100%',
    justifyContent: 'space-between',
  },
  contentLandscape: {
    flexDirection: 'row',
    padding: 10,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16/9,
    backgroundColor: '#111',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  videoContainerLandscape: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  webview: {
    width: '100%',
    height: '100%',
  },
  controlsContainer: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    marginTop: 'auto',
  },
  controlsContainerLandscape: {
    width: 200,
    justifyContent: 'center',
    minWidth: 150,
    alignSelf: 'stretch',
    flexShrink: 0,
    padding: 15,
    marginTop: 0,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  controlsLandscape: {
    flexDirection: 'column',
    gap: 8,
    width: '100%',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    backgroundColor: '#333',
    minWidth: 80,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLandscape: {
    width: '100%',
    flex: 0,
    minWidth: 0,
    marginHorizontal: 0,
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeButtonText: {
    color: '#FFF',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  controlButton: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    flex: 1,
  },
  // 最初から再生ボタン用のスタイル
  restartButton: {
    backgroundColor: '#fff', // 白色に変更
  },
  // 続きから再生ボタン用のスタイル
  resumeButton: {
    backgroundColor: '#007bff', // 青色はそのまま
  },
  controlButtonLandscape: {
    width: '100%',
    flex: 0,
    paddingHorizontal: 10,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff', // デフォルトのテキストカラーを白に設定
  },
  // 最初から再生ボタンのテキスト用のスタイル
  restartButtonText: {
    color: '#000', // 最初から再生ボタンのみ黒色に上書き
  },
  loopButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginTop: 15,
  },
  loopButtonActive: {
    backgroundColor: '#007AFF',
  },
  gameButton: {
    marginTop: 20,
    width: '100%',
    borderRadius: 25, // 他のボタンと同じ丸み
  },
  // ゲームボタンのスタイルをカスタマイズするためのプロパティ
  gameButtonStyle: {
    backgroundColor: '#28a745', // 緑色
    paddingVertical: 15, // 他のボタンと同じ高さ
  },
});
