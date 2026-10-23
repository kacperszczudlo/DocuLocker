import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function WarrantiesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gwarancje i terminy</Text>
      <Text style={styles.subtext}>Modul osi czasu gwarancji bedzie wdrazany w Etapie 4.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtext: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
