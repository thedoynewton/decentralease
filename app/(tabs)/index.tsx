import { FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import { styles } from "@/styles/home.styles";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";

const featuredRentals = [
  { id: "1", image: require("@/assets/images/car.png") },
  { id: "2", image: require("@/assets/images/car.png") },
  { id: "3", image: require("@/assets/images/car.png") },
];

export default function Index() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / 300);
    setCurrentIndex(index);
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        {/* Location Selector (Left) */}
        <TouchableOpacity style={styles.locationContainer}>
        <View style={styles.locationRow}>
            <Text style={styles.locationText}>Your location</Text>
            <Ionicons name="chevron-down" size={16} color="#888" />
          </View>
          <Text style={styles.locationValue}>Davao City, Philippines</Text>
        </TouchableOpacity>

        {/* Icons (Right) */}
        <View style={styles.iconContainer}>
          <TouchableOpacity>
            <Ionicons name="search" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>

{/* Featured Rentals (Image Slider) */}
<FlatList
        ref={flatListRef}
        data={featuredRentals}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Image source={item.image} style={styles.featuredImage} />
        )}
      />

      {/* Carousel Indicators */}
      <View style={styles.indicatorContainer}>
        {featuredRentals.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              currentIndex === index && styles.activeIndicator,
            ]}
          />
        ))}
      </View>

    </View>
  );
}
