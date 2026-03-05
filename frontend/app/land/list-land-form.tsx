import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import s from "../../src/styles/listLandFormStyles";
import { API_BASE_URL } from "../../src/config";
import { useAuth } from "../../context/AuthContext";

const PURPOSES = ["sell", "lease", "partnership", "contract"] as const;

// ==================== COMPONENT ====================
export default function ListLandFormScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ polygon?: string }>();
    const { token } = useAuth();

    /* ---------- state ---------- */
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: validation
    const [polygonCoords, setPolygonCoords] = useState<number[][]>([]);
    const [validation, setValidation] = useState<{
        allowed: boolean;
        reason: string;
    } | null>(null);

    // Step 2: analysis (auto-populated on create)
    const [analysis, setAnalysis] = useState<any>(null);

    // Step 3: owner details
    const [ownerName, setOwnerName] = useState("");
    const [ownerPhone, setOwnerPhone] = useState("");
    const [ownerEmail, setOwnerEmail] = useState("");
    const [ownerAddress, setOwnerAddress] = useState("");

    // Step 4: land info
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [currentLandUse, setCurrentLandUse] = useState("");
    const [soilType, setSoilType] = useState("");
    const [waterAvailability, setWaterAvailability] = useState("");
    const [roadAccess, setRoadAccess] = useState(false);
    const [electricity, setElectricity] = useState(false);
    const [listingPurpose, setListingPurpose] = useState<string>("sell");
    const [expectedPrice, setExpectedPrice] = useState("");

    // Step 5: Media & Docs
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [selectedDocs, setSelectedDocs] = useState<
        Array<{ uri: string; name: string; mime: string }>
    >([]);

    // Step 6: success
    const [verificationCode, setVerificationCode] = useState("");
    const [listingId, setListingId] = useState<number | null>(null);

    // Slideshow state
    const [currentSlide, setCurrentSlide] = useState(0);
    const slideshowTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auto-cycle slideshow every 2 seconds
    useEffect(() => {
        if (selectedImages.length > 1 && step === 5) {
            slideshowTimer.current = setInterval(() => {
                setCurrentSlide((prev) => (prev + 1) % selectedImages.length);
            }, 2000);
        } else {
            setCurrentSlide(0);
        }
        return () => {
            if (slideshowTimer.current) clearInterval(slideshowTimer.current);
        };
    }, [selectedImages.length, step]);

    /* ---------- init ---------- */
    useEffect(() => {
        if (params.polygon) {
            try {
                const coords = JSON.parse(params.polygon);
                setPolygonCoords(coords);
            } catch {
                Alert.alert("Error", "Invalid polygon data.");
            }
        }
    }, [params.polygon]);

    /* ---------- Step 1: Validate ---------- */
    const validateArea = useCallback(async () => {
        if (polygonCoords.length < 3) {
            Alert.alert("Error", "At least 3 points required.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/listings/validate-area`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coordinates: polygonCoords })
            });
            const data = await res.json();
            setValidation({ allowed: data.allowed, reason: data.reason });
        } catch (e: any) {
            Alert.alert("Network Error", e.message);
        } finally {
            setLoading(false);
        }
    }, [polygonCoords]);

    useEffect(() => {
        if (polygonCoords.length >= 3 && step === 1) {
            validateArea();
        }
    }, [polygonCoords, step]);

    /* ---------- Step 5: Submit ---------- */
    const submitListing = async () => {
        if (!ownerName.trim() || !ownerPhone.trim()) {
            Alert.alert("Missing Info", "Owner name and phone are required.");
            return;
        }
        if (!title.trim()) {
            Alert.alert("Missing Info", "Please enter a title for the listing.");
            return;
        }

        setLoading(true);
        try {
            const body = {
                owner_name: ownerName.trim(),
                owner_phone: ownerPhone.trim(),
                owner_email: ownerEmail.trim() || null,
                owner_address: ownerAddress.trim() || null,
                coordinates: polygonCoords,
                title: title.trim(),
                description: description.trim() || null,
                current_land_use: currentLandUse.trim() || null,
                soil_type: soilType.trim() || null,
                water_availability: waterAvailability.trim() || null,
                road_access: roadAccess,
                electricity,
                listing_purpose: listingPurpose,
                expected_price: expectedPrice ? parseFloat(expectedPrice) : null
            };

            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_BASE_URL}/api/listings/create`, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.detail || `Server error ${res.status}`);
            }

            const data = await res.json();
            const newListingId = data.id;
            setVerificationCode(data.verification_code);
            setListingId(newListingId);
            setAnalysis(data.analysis || null);

            // ---------------- Upload Photos ----------------
            if (selectedImages.length > 0) {
                const photoData = new FormData();
                selectedImages.forEach((uri, idx) => {
                    const ext = uri.split(".").pop() || "jpg";
                    photoData.append("files", {
                        uri,
                        name: `photo-${idx}.${ext}`,
                        type: `image/${ext}`
                    } as any);
                });

                const photoHeaders: Record<string, string> = {};
                if (token) {
                    photoHeaders["Authorization"] = `Bearer ${token}`;
                }

                const photoRes = await fetch(`${API_BASE_URL}/api/listings/${newListingId}/photos`, {
                    method: "POST",
                    headers: photoHeaders,
                    body: photoData
                });

                if (!photoRes.ok) {
                    const errText = await photoRes.text();
                    throw new Error(`Photo upload failed: ${errText}`);
                }
            }

            // ---------------- Upload Documents ----------------
            if (selectedDocs.length > 0) {
                const docData = new FormData();
                selectedDocs.forEach((doc, idx) => {
                    docData.append("files", {
                        uri: doc.uri,
                        name: doc.name,
                        type: doc.mime
                    } as any);
                });

                const docHeaders: Record<string, string> = {};
                if (token) {
                    docHeaders["Authorization"] = `Bearer ${token}`;
                }

                const docRes = await fetch(`${API_BASE_URL}/api/listings/${newListingId}/documents`, {
                    method: "POST",
                    headers: docHeaders,
                    body: docData
                });

                if (!docRes.ok) {
                    const errText = await docRes.text();
                    throw new Error(`Document upload failed: ${errText}`);
                }
            }

            setStep(7); // success
        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    /* ---------- UI Pickers ---------- */
    const pickImages = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.7,
                selectionLimit: 5 - selectedImages.length, // Only allow up to remaining shots
            });

            if (!result.canceled) {
                const newUris = result.assets.map((a) => a.uri);
                setSelectedImages((prev) => {
                    const combined = [...prev, ...newUris];
                    if (combined.length > 5) {
                        Alert.alert("Limit Explored", "You can only select up to 5 photos. Dropping extras.");
                        return combined.slice(0, 5);
                    }
                    return combined;
                });
            }
        } catch (e) {
            console.log("Image picker error", e);
        }
    };

    const removeImage = (index: number) => {
        setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    };

    const pickDocument = async () => {
        if (selectedDocs.length >= 3) {
            Alert.alert("Limit Reached", "Max 3 documents allowed.");
            return;
        }
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
                multiple: true
            });

            if (!result.canceled && result.assets) {
                const newDocs = result.assets.map((a) => ({
                    uri: a.uri,
                    name: a.name,
                    mime: a.mimeType || "application/pdf"
                }));
                setSelectedDocs((prev) => {
                    const combined = [...prev, ...newDocs];
                    if (combined.length > 3) {
                        Alert.alert("Limit Exceeded", "Max 3 documents allowed.");
                        return combined.slice(0, 3);
                    }
                    return combined;
                });
            }
        } catch (e) {
            console.log("Document picker error", e);
        }
    };

    const removeDocument = (index: number) => {
        setSelectedDocs((prev) => prev.filter((_, i) => i !== index));
    };

    /* ---------- Renderers ---------- */
    const renderStepIndicator = () => (
        <View style={s.stepIndicator}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
                <View
                    key={n}
                    style={[
                        s.stepDot,
                        step === n && s.stepDotActive,
                        step > n && s.stepDotDone,
                    ]}
                />
            ))}
        </View>
    );

    // ---------- Step 1: Validate Area ----------
    const renderStep1 = () => (
        <View style={s.section}>
            <Text style={s.sectionTitle}>📍 Area Validation</Text>
            <Text style={s.sectionDesc}>
                Checking if your selected area is eligible for listing...
            </Text>

            <View style={s.analysisStat}>
                <Text style={s.analysisStatLabel}>Polygon points</Text>
                <Text style={s.analysisStatValue}>{polygonCoords.length}</Text>
            </View>

            {loading && (
                <ActivityIndicator
                    size="small"
                    color="#60a5fa"
                    style={{ marginTop: 16 }}
                />
            )}

            {validation && (
                <View
                    style={[
                        s.validationBox,
                        validation.allowed ? s.validationBoxOk : s.validationBoxFail,
                        { marginTop: 16 },
                    ]}
                >
                    <Text style={s.validationIcon}>
                        {validation.allowed ? "✅" : "❌"}
                    </Text>
                    <Text style={s.validationText}>{validation.reason}</Text>
                </View>
            )}

            {validation?.allowed && (
                <Pressable style={s.btnPrimary} onPress={() => setStep(2)}>
                    <Text style={s.btnPrimaryText}>Continue →</Text>
                </Pressable>
            )}

            {validation && !validation.allowed && (
                <Pressable
                    style={s.btnSecondary}
                    onPress={() => router.back()}
                >
                    <Text style={s.btnSecondaryText}>← Back to Map</Text>
                </Pressable>
            )}
        </View>
    );

    // ---------- Step 2: ML Analysis Preview ----------
    const renderStep2 = () => (
        <View style={s.section}>
            <Text style={s.sectionTitle}>🔬 Land Analysis Preview</Text>
            <Text style={s.sectionDesc}>
                The full ML analysis will run when you submit your listing.
                Below is a summary of the area you've selected.
            </Text>

            <View style={s.analysisStat}>
                <Text style={s.analysisStatLabel}>Points</Text>
                <Text style={s.analysisStatValue}>{polygonCoords.length}</Text>
            </View>
            <View style={s.analysisStat}>
                <Text style={s.analysisStatLabel}>Status</Text>
                <Text style={[s.analysisStatValue, { color: "#22c55e" }]}>
                    ✅ Eligible for listing
                </Text>
            </View>

            <View style={s.navRow}>
                <Pressable
                    style={[s.navBtn, s.navBtnBack]}
                    onPress={() => setStep(1)}
                >
                    <Text style={s.navBtnText}>← Back</Text>
                </Pressable>
                <Pressable
                    style={[s.navBtn, s.navBtnNext]}
                    onPress={() => setStep(3)}
                >
                    <Text style={s.navBtnText}>Next →</Text>
                </Pressable>
            </View>
        </View>
    );

    // ---------- Step 3: Owner Details ----------
    const renderStep3 = () => (
        <View style={s.section}>
            <Text style={s.sectionTitle}>👤 Owner Details</Text>

            <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Full Name *</Text>
                <TextInput
                    style={s.input}
                    value={ownerName}
                    onChangeText={setOwnerName}
                    placeholder="e.g. Kamal Perera"
                    placeholderTextColor="#475569"
                />
            </View>

            <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Phone Number *</Text>
                <TextInput
                    style={s.input}
                    value={ownerPhone}
                    onChangeText={setOwnerPhone}
                    placeholder="e.g. 0771234567"
                    placeholderTextColor="#475569"
                    keyboardType="phone-pad"
                />
            </View>

            <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Email (optional)</Text>
                <TextInput
                    style={s.input}
                    value={ownerEmail}
                    onChangeText={setOwnerEmail}
                    placeholder="e.g. kamal@example.com"
                    placeholderTextColor="#475569"
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
            </View>

            <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Address (optional)</Text>
                <TextInput
                    style={[s.input, s.textArea]}
                    value={ownerAddress}
                    onChangeText={setOwnerAddress}
                    placeholder="Your address"
                    placeholderTextColor="#475569"
                    multiline
                />
            </View>

            <View style={s.navRow}>
                <Pressable
                    style={[s.navBtn, s.navBtnBack]}
                    onPress={() => setStep(2)}
                >
                    <Text style={s.navBtnText}>← Back</Text>
                </Pressable>
                <Pressable
                    style={[
                        s.navBtn,
                        s.navBtnNext,
                        (!ownerName.trim() || !ownerPhone.trim()) && s.btnPrimaryDisabled,
                    ]}
                    disabled={!ownerName.trim() || !ownerPhone.trim()}
                    onPress={() => setStep(4)}
                >
                    <Text style={s.navBtnText}>Next →</Text>
                </Pressable>
            </View>
        </View>
    );

    // ---------- Step 4: Land Information ----------
    const renderStep4 = () => (
        <View style={s.section}>
            <Text style={s.sectionTitle}>🌾 Land Information</Text>

            <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Listing Title *</Text>
                <TextInput
                    style={s.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Fertile 2-acre plot near Malabe"
                    placeholderTextColor="#475569"
                />
            </View>

            <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Description (optional)</Text>
                <TextInput
                    style={[s.input, s.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe the land, surrounding area, etc."
                    placeholderTextColor="#475569"
                    multiline
                />
            </View>

            <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Current Land Use</Text>
                <TextInput
                    style={s.input}
                    value={currentLandUse}
                    onChangeText={setCurrentLandUse}
                    placeholder="e.g. Paddy, Coconut, Unused"
                    placeholderTextColor="#475569"
                />
            </View>

            <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Soil Type</Text>
                <TextInput
                    style={s.input}
                    value={soilType}
                    onChangeText={setSoilType}
                    placeholder="e.g. Laterite, Alluvial, Red"
                    placeholderTextColor="#475569"
                />
            </View>

            <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Water Availability</Text>
                <TextInput
                    style={s.input}
                    value={waterAvailability}
                    onChangeText={setWaterAvailability}
                    placeholder="e.g. Well, Canal, Rain-fed"
                    placeholderTextColor="#475569"
                />
            </View>

            <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Road Access</Text>
                <Pressable
                    style={[s.toggleBtn, roadAccess && s.toggleBtnActive]}
                    onPress={() => setRoadAccess(!roadAccess)}
                >
                    <View
                        style={[s.toggleCircle, roadAccess && s.toggleCircleActive]}
                    />
                </Pressable>
            </View>

            <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Electricity Available</Text>
                <Pressable
                    style={[s.toggleBtn, electricity && s.toggleBtnActive]}
                    onPress={() => setElectricity(!electricity)}
                >
                    <View
                        style={[s.toggleCircle, electricity && s.toggleCircleActive]}
                    />
                </Pressable>
            </View>

            <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Listing Purpose</Text>
                <View style={s.pillRow}>
                    {PURPOSES.map((p) => (
                        <Pressable
                            key={p}
                            style={[s.pill, listingPurpose === p && s.pillActive]}
                            onPress={() => setListingPurpose(p)}
                        >
                            <Text
                                style={[s.pillText, listingPurpose === p && s.pillTextActive]}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Expected Price (LKR) — optional</Text>
                <TextInput
                    style={s.input}
                    value={expectedPrice}
                    onChangeText={setExpectedPrice}
                    placeholder="e.g. 5000000"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                />
            </View>

            <View style={s.navRow}>
                <Pressable
                    style={[s.navBtn, s.navBtnBack]}
                    onPress={() => setStep(3)}
                >
                    <Text style={s.navBtnText}>← Back</Text>
                </Pressable>
                <Pressable
                    style={[s.navBtn, s.navBtnNext, !title.trim() && s.btnPrimaryDisabled]}
                    disabled={!title.trim()}
                    onPress={() => setStep(5)}
                >
                    <Text style={s.navBtnText}>Review →</Text>
                </Pressable>
            </View>
        </View>
    );

    // ---------- Step 5: Media & Docs ----------
    const renderStep5 = () => (
        <View style={s.section}>
            <Text style={s.sectionTitle}>📸 Photos & Documents</Text>

            {/* Photo Slideshow */}
            {selectedImages.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                    <View style={{
                        borderRadius: 16,
                        overflow: 'hidden',
                        backgroundColor: '#0f172a',
                        height: 220,
                    }}>
                        <Image
                            source={{ uri: selectedImages[currentSlide] || selectedImages[0] }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                        {selectedImages[currentSlide] && currentSlide === 0 && (
                            <View style={{
                                position: 'absolute', top: 10, left: 10,
                                backgroundColor: 'rgba(15,23,42,0.8)',
                                paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                            }}>
                                <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '800' }}>⭐ Primary</Text>
                            </View>
                        )}
                        <View style={{
                            position: 'absolute', bottom: 10, left: 0, right: 0,
                            flexDirection: 'row', justifyContent: 'center', gap: 6,
                        }}>
                            {selectedImages.map((_, idx) => (
                                <View key={idx} style={{
                                    width: idx === currentSlide ? 20 : 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: idx === currentSlide ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                                }} />
                            ))}
                        </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 6, fontWeight: '600' }}>
                        📸 {selectedImages.length} photo{selectedImages.length > 1 ? 's' : ''} selected — auto-cycling preview
                    </Text>
                </View>
            )}

            {/* Photos Section */}
            <View style={s.cardGroup}>
                <View style={[s.rowBetween, { marginBottom: 8 }]}>
                    <Text style={s.inputLabel}>Photos (2–5) *</Text>
                    <Text style={s.badgeRequired}>Required</Text>
                </View>
                <Text style={s.helperText}>First photo will be the main thumbnail.</Text>

                <Pressable style={s.btnOutline} onPress={pickImages}>
                    <Text style={s.btnOutlineText}>🖼️ Select from gallery</Text>
                </Pressable>

                <View style={s.mediaGrid}>
                    {selectedImages.map((uri, idx) => (
                        <View key={idx} style={s.imageThumbContainer}>
                            <Image source={{ uri }} style={s.imageThumb} />
                            {idx === 0 && (
                                <View style={s.primaryBadge}>
                                    <Text style={s.primaryBadgeText}>⭐</Text>
                                </View>
                            )}
                            <Pressable style={s.removeBtn} onPress={() => removeImage(idx)}>
                                <Text style={s.removeBtnText}>✕</Text>
                            </Pressable>
                        </View>
                    ))}
                </View>
                {selectedImages.length > 0 && selectedImages.length < 2 && (
                    <Text style={s.errorText}>Please select at least 2 photos.</Text>
                )}
            </View>

            <View style={s.divider} />

            {/* Documents Section - NOW REQUIRED */}
            <View style={s.cardGroup}>
                <View style={[s.rowBetween, { marginBottom: 8 }]}>
                    <Text style={s.inputLabel}>Land Documents (1–3) *</Text>
                    <Text style={s.badgeRequired}>Required</Text>
                </View>
                <Text style={s.helperText}>Upload deed, survey plan, or NIC to speed up verification.</Text>

                <Pressable style={s.btnOutline} onPress={pickDocument}>
                    <Text style={s.btnOutlineText}>📑 Select Documents</Text>
                </Pressable>

                <View style={s.docList}>
                    {selectedDocs.map((doc, idx) => (
                        <View key={idx} style={s.docItem}>
                            <Text style={s.docIcon}>
                                {doc.mime.includes("pdf") ? "📄" : "🖼️"}
                            </Text>
                            <Text style={s.docName} numberOfLines={1}>{doc.name}</Text>
                            <Pressable style={s.docRemove} onPress={() => removeDocument(idx)}>
                                <Text style={s.docRemoveText}>✕</Text>
                            </Pressable>
                        </View>
                    ))}
                </View>
                {selectedDocs.length === 0 && (
                    <Text style={s.errorText}>At least 1 document is required.</Text>
                )}
            </View>

            <View style={s.navRow}>
                <Pressable style={[s.navBtn, s.navBtnBack]} onPress={() => setStep(4)}>
                    <Text style={s.navBtnText}>← Back</Text>
                </Pressable>
                <Pressable
                    style={[
                        s.navBtn,
                        s.navBtnNext,
                        (selectedImages.length < 2 || selectedDocs.length < 1) && s.btnPrimaryDisabled
                    ]}
                    disabled={selectedImages.length < 2 || selectedDocs.length < 1}
                    onPress={() => setStep(6)}
                >
                    <Text style={s.navBtnText}>Review →</Text>
                </Pressable>
            </View>
        </View>
    );

    // ---------- Step 6: Review & Submit ----------
    const renderStep6 = () => (
        <View style={s.section}>
            <Text style={s.sectionTitle}>📋 Review & Submit</Text>

            <View style={s.analysisStat}>
                <Text style={s.analysisStatLabel}>Title</Text>
                <Text style={s.analysisStatValue}>{title}</Text>
            </View>
            <View style={s.analysisStat}>
                <Text style={s.analysisStatLabel}>Owner</Text>
                <Text style={s.analysisStatValue}>{ownerName}</Text>
            </View>
            {expectedPrice ? (
                <View style={s.analysisStat}>
                    <Text style={s.analysisStatLabel}>Price (LKR)</Text>
                    <Text style={s.analysisStatValue}>
                        {Number(expectedPrice).toLocaleString()}
                    </Text>
                </View>
            ) : null}
            <View style={s.analysisStat}>
                <Text style={s.analysisStatLabel}>Photos</Text>
                <Text style={s.analysisStatValue}>{selectedImages.length}</Text>
            </View>
            <View style={s.analysisStat}>
                <Text style={s.analysisStatLabel}>Documents</Text>
                <Text style={s.analysisStatValue}>{selectedDocs.length}</Text>
            </View>
            <View style={s.analysisStat}>
                <Text style={s.analysisStatLabel}>Polygon points</Text>
                <Text style={s.analysisStatValue}>{polygonCoords.length}</Text>
            </View>

            <View style={s.navRow}>
                <Pressable style={[s.navBtn, s.navBtnBack]} onPress={() => setStep(5)}>
                    <Text style={s.navBtnText}>← Edit</Text>
                </Pressable>
                <Pressable
                    style={[s.navBtn, s.navBtnNext]}
                    onPress={submitListing}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={s.navBtnText}>Submit ✓</Text>
                    )}
                </Pressable>
            </View>
        </View>
    );

    // ---------- Step 6: Success ----------
    const renderSuccess = () => (
        <View style={[s.section, s.successContainer]}>
            <Text style={s.successIcon}>🎉</Text>
            <Text style={s.successTitle}>Listing Submitted!</Text>
            <Text style={s.successSubtitle}>
                Your land listing has been submitted for verification.{"\n"}
                Save your Land ID below.
            </Text>

            <View style={s.verificationCodeBox}>
                <Text style={s.verificationCodeLabel}>LAND ID</Text>
                <Text style={s.verificationCode}>LND-{listingId}</Text>
            </View>

            {analysis?.area_hectares && (
                <View style={s.analysisStat}>
                    <Text style={s.analysisStatLabel}>Area</Text>
                    <Text style={s.analysisStatValue}>
                        {analysis.area_hectares} ha / {analysis.area_acres?.toFixed(2)} acres
                    </Text>
                </View>
            )}
            {analysis?.prediction?.label && (
                <View style={s.analysisStat}>
                    <Text style={s.analysisStatLabel}>Land Type</Text>
                    <Text style={s.analysisStatValue}>{analysis.prediction.label}</Text>
                </View>
            )}

            <Pressable
                style={[s.btnPrimary, { marginTop: 24, width: "100%" }]}
                onPress={() => router.replace(`/(main)/marketplace?focusId=${listingId}`)}
            >
                <Text style={s.btnPrimaryText}>See Listed Land</Text>
            </Pressable>

            <Pressable
                style={{ marginTop: 16, alignItems: "center" }}
                onPress={() => router.back()}
            >
                <Text style={{ color: "#94a3b8", fontWeight: "600", fontSize: 15 }}>← Back to Map</Text>
            </Pressable>
        </View>
    );

    /* ---------- Main render ---------- */
    const stepTitles = [
        "",
        "Validate Area",
        "Analysis Preview",
        "Owner Details",
        "Land Info",
        "Photos & Docs",
        "Review & Submit",
        "Success",
    ];

    return (
        <SafeAreaView style={[s.outerContainer, { paddingBottom: 0 }]}>
            {/* Header */}
            <View style={[s.header, { paddingTop: insets.top + 14 }]}>
                <View>
                    <Text style={s.headerTitle}>📋 List Your Land</Text>
                    <Text style={s.headerSubtitle}>
                        {step <= 6
                            ? `Step ${step}/6 — ${stepTitles[step]}`
                            : "Submitted!"}
                    </Text>
                </View>
                <Pressable style={s.backBtn} onPress={() => router.back()}>
                    <Text style={s.backBtnText}>✕</Text>
                </Pressable>
            </View>

            {step <= 6 && renderStepIndicator()}

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={s.scrollContent}>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                    {step === 5 && renderStep5()}
                    {step === 6 && renderStep6()}
                    {step === 7 && renderSuccess()}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
