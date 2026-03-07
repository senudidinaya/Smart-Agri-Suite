import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Dimensions, TextInput } from 'react-native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Map spice names to local generated premium images
const SPICE_IMAGES: Record<string, any> = {
    'Cardamom': require('../../../assets/spices/cardamom.png'),
    'Black Pepper': require('../../../assets/spices/black_pepper.png'),
    'Cinnamon': require('../../../assets/spices/cinnamon.png'),
    // Fallback image for others
    'default': require('../../../assets/spices/cardamom.png'),
};

export default function CustomerDashboard({ navigation }: any) {
    const [spices, setSpices] = useState<any[]>([]);
    const [filteredSpices, setFilteredSpices] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSpices();
    }, []);

    const fetchSpices = async () => {
        try {
            const response = await api.get('/marketplace/spices');
            setSpices(response.data);
            setFilteredSpices(response.data);
        } catch (error) {
            console.log('Error fetching spices', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setFilteredSpices(spices);
        } else {
            const lowQuery = query.toLowerCase();
            const filtered = spices.filter(spice =>
                spice.name.toLowerCase().includes(lowQuery) ||
                (spice.description && spice.description.toLowerCase().includes(lowQuery))
            );
            setFilteredSpices(filtered);
        }
    };

    const getImageForSpice = (name: string) => {
        return SPICE_IMAGES[name] || SPICE_IMAGES['default'];
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SpiceDetails', { spice: item })}
        >
            <Image source={getImageForSpice(item.name)} style={styles.spiceImage} resizeMode="cover" />

            <View style={styles.cardContent}>
                <Text style={styles.spiceName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.spiceDesc} numberOfLines={2}>{item.description}</Text>

                <View style={styles.actionRow}>
                    <Text style={styles.orderText}>Buy Now</Text>
                    <View style={styles.iconCircle}>
                        <Ionicons name="cart" size={16} color="#4CAF50" />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={[]}>
            <Header title="Premium Spices" themeColor="#4CAF50" />

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search exotic spices..."
                        placeholderTextColor="#888"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={20} color="#ccc" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                </View>
            ) : (
                <FlatList
                    data={filteredSpices}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    numColumns={2}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.row}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, color: '#333', fontSize: 16, paddingVertical: 8 },
    list: { padding: 16, paddingBottom: 32 },
    row: { justifyContent: 'space-between' },
    card: {
        width: CARD_WIDTH,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    spiceImage: {
        width: '100%',
        height: 140,
        backgroundColor: '#e9ecef',
    },
    cardContent: {
        padding: 12,
    },
    spiceName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 4,
    },
    spiceDesc: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12,
        lineHeight: 18,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
    },
    orderText: {
        color: '#4CAF50',
        fontWeight: 'bold',
        fontSize: 15,
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
