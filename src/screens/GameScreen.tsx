import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { Button } from 'react-native-elements';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  Game: undefined;
  GameResult: { count: number };
};

type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Game'>;

type Props = {
  navigation: GameScreenNavigationProp;
};

const GAME_DURATION = 10; // 10秒

export const GameScreen = ({ navigation }: Props) => {
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReadyForTap, setIsReadyForTap] = useState(false); // 振った後のタップ待ち状態
  const lastTime = useRef(Date.now());

  // ゲームをリセット
  const resetGame = () => {
    setCount(0);
    setTimeLeft(GAME_DURATION);
    setIsPlaying(false);
    setIsReadyForTap(false);
    lastTime.current = Date.now();
  };

  // ゲーム開始時の処理
  const startGame = async () => {
    resetGame();
    setIsPlaying(true);
  };

  // ゲーム中の動き検知
  useEffect(() => {
    if (!isPlaying) return;

    const checkMotion = (acceleration: number) => {
      const now = Date.now();
      if (acceleration > 2.0 && now - lastTime.current > 200 && !isReadyForTap) {
        console.log('Mochi hit detected:', acceleration);
        setIsReadyForTap(true); // タップ待ち状態に
        lastTime.current = now;
      }
    };

    const motionSubscription = Accelerometer.addListener(({ x, y, z }) => {
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      checkMotion(acceleration);
    });

    return () => {
      motionSubscription.remove();
    };
  }, [isPlaying, isReadyForTap]);

  // タップ処理
  const handleTap = () => {
    if (isReadyForTap) {
      setCount(prev => prev + 1);
      setIsReadyForTap(false);
    }
  };

  // ゲーム終了時のクリーンアップ
  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
      Accelerometer.removeAllListeners();
      setIsPlaying(false);
      navigation.navigate('GameResult', { count });
    }
  }, [timeLeft, isPlaying, count, navigation]);

  // タイマー処理を追加
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isPlaying, timeLeft]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>餅つきゲーム</Text>
      <Text style={styles.count}>回数: {count}</Text>
      <Text style={styles.timer}>残り時間: {timeLeft}秒</Text>
      {isPlaying ? (
        <View style={styles.playArea}>
          <Text style={styles.instruction}>
            {isReadyForTap
              ? "タップして餅を返そう！"
              : "スマートフォンを振って\n餅をつこう！"}
          </Text>
          <TouchableOpacity
            style={[
              styles.tapArea,
              isReadyForTap && styles.tapAreaReady
            ]}
            onPress={handleTap}
          >
            <Text style={styles.tapText}>
              {isReadyForTap ? "餅を返す！" : "餅をつく準備OK!"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Button
          title="スタート"
          onPress={startGame}
          containerStyle={styles.buttonContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  count: {
    fontSize: 32,
    marginBottom: 10,
  },
  timer: {
    fontSize: 24,
    marginBottom: 20,
  },
  buttonContainer: {
    width: 200,
  },
  tapArea: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#000',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapText: {
    fontSize: 24,
  },
  playArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instruction: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 32,
  },
  tapAreaReady: {
    backgroundColor: '#e0e0e0', // タップ待ち状態を視覚的に表示
    borderColor: '#007AFF',
  },
});
