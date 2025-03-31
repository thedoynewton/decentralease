// styles/home.styles.ts
import { COLORS } from "@/constants/theme";
import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 30, // Adjust for status bar
      },
      header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      },
      locationContainer: {
        flexDirection: "column",
      },
      locationText: {
        fontSize: 12,
        color: "#888",
      },
      locationValue: {
        fontSize: 16,
        fontWeight: "bold",
      },
      iconContainer: {
        flexDirection: "row",
        gap: 16,
      },
      locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4, // Space between text and icon
      },
      featuredImage: {
        width: 300,
        height: 180,
        borderRadius: 10,
        marginRight: 10,
      },
      indicatorContainer: {
        flexDirection: "row",
        alignSelf: "center",
        marginTop: 8,
      },
      indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "grey",
        marginHorizontal: 4,
      },
      activeIndicator: {
        backgroundColor: "blue",
        width: 12,
        height: 8,
        borderRadius: 4,
      },
    
})