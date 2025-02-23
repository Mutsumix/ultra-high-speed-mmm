import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-elements';

const getRank = (count: number) => {
  if (count >= 30) return '横綱';
  if (count >= 25) return '大関';
  if (count >= 20) return '関脇';
  if (count >= 15) return '小結';
  if (count >= 10) return '前頭';
  if (count >= 5) return '十両';
  return '序の口';
};

export const GameResultScreen = ({ navigation, route }) => {
  const { count } = route.params;
  const rank = getRank(count);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>結果発表</Text>
      <Text style={styles.count}>{count}回</Text>
      <Text style={styles.rank}>あなたの階級は...</Text>
      <Text style={styles.rankResult}>{rank}</Text>
      <Button
        title="もう一度挑戦"
        onPress={() => {
          navigation.goBack();
          setTimeout(() => {
            navigation.getParent()?.setParams({ shouldReset: true });
          }, 100);
        }}
        containerStyle={styles.buttonContainer}
      />
      <Button
        title="トップに戻る"
        onPress={() => navigation.popToTop()}
        containerStyle={styles.buttonContainer}
        type="outline"
      />
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
    marginBottom: 20,
  },
  rank: {
    fontSize: 20,
    marginBottom: 10,
  },
  rankResult: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  buttonContainer: {
    width: 200,
    marginVertical: 10,
  },
});
