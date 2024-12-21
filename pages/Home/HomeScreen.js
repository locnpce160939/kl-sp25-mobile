import React, { useContext } from "react";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { AuthContext } from "../../contexts/AuthContext";

const HomeScreen = ({ navigation }) => {

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Hello!</Text>

    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  welcomeText: {
    fontSize: 24,
    marginBottom: 20,
  },

});
