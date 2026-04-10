import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import { CONFIG } from '@/constants/Config';

const { width } = Dimensions.get('window');

export default function SignScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [prediction, setPrediction] = useState('');
  const [sentence, setSentence] = useState('Waiting for sign...');
  const [translatedSentence, setTranslatedSentence] = useState('');
  const [isHindi, setIsHindi] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (permission?.granted && isCapturing) {
      // Increased to 1.5s for stability
      interval = setInterval(captureFrame, 1500);
    }
    return () => clearInterval(interval);
  }, [permission, isCapturing]);

  useEffect(() => {
    if (isHindi && sentence.trim() && sentence !== 'Waiting for sign...') {
      translateCurrentSentence();
    } else {
      setTranslatedSentence('');
    }
  }, [sentence, isHindi]);

  const translateCurrentSentence = async () => {
    setIsTranslating(true);
    try {
      const resp = await axios.post(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.TRANSLATE}`, {
        text: sentence,
        target: 'Hindi'
      });
      setTranslatedSentence(resp.data.translated || '');
    } catch (error) {
      console.error('Translation Error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const captureFrame = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.2, // Lower quality for faster network transfer
        scale: 0.5,
      });

      if (photo?.base64) {
        // Adding a 2s timeout to avoid stacking requests
        const response = await axios.post(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.PREDICT}`, {
          image: photo.base64,
        }, { timeout: 2000 });

        if (response.data.prediction) {
          setPrediction(response.data.prediction);
        }
        if (response.data.sentence) {
          setSentence(response.data.sentence);
        }
      }
    } catch (error: any) {
      console.warn('[Sign API Error]', error.message);
    }
  };

  const handleAction = async (endpoint: string) => {
    try {
      const resp = await axios.post(`${CONFIG.BASE_URL}${endpoint}`);
      if (resp.data.sentence !== undefined) {
        setSentence(resp.data.sentence || 'Waiting for sign...');
      } else if (resp.data.status === 'cleared') {
        setSentence('Waiting for sign...');
      }
    } catch (error) {
      console.error('Action Error:', error);
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hand2Help Sign</Text>
        <TouchableOpacity 
            style={[styles.langToggle, isHindi ? styles.langToggleActive : null]}
            onPress={() => setIsHindi(!isHindi)}
        >
            <Text style={styles.langToggleText}>{isHindi ? 'हिन्दी (HI)' : 'English (EN)'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        {prediction ? (
          <View style={styles.predictionBadge}>
            <Text style={styles.predictionText}>{prediction}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.sentenceContainer}>
        <Text style={styles.label}>Detected Sentence</Text>
        <View style={styles.sentenceBox}>
          <Text style={styles.sentenceTextDisplay}>
            {isHindi ? (isTranslating ? 'अनुवाद हो रहा है...' : translatedSentence || 'संकेत की प्रतीक्षा...') : sentence}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.actionBtn, isCapturing ? styles.stopBtn : styles.startBtn]} 
            onPress={() => setIsCapturing(!isCapturing)}
          >
            <Text style={styles.btnText}>{isCapturing ? 'Stop Detection' : 'Start Detection'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.miniBtn, styles.primary]} onPress={() => handleAction(CONFIG.ENDPOINTS.SPACE)}>
            <Text style={styles.miniBtnText}>Space</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.miniBtn, styles.warning]} onPress={() => handleAction(CONFIG.ENDPOINTS.BACKSPACE)}>
            <Text style={styles.miniBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.miniBtn, styles.danger]} onPress={() => handleAction(CONFIG.ENDPOINTS.CLEAR)}>
            <Text style={styles.miniBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    textAlign: 'center',
    flex: 1,
  },
  langToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  langToggleActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  langToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  cameraContainer: {
    width: width - 32,
    height: width - 32,
    margin: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignSelf: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  camera: {
    flex: 1,
  },
  predictionBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 12,
  },
  predictionText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  sentenceContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sentenceBox: {
    marginTop: 8,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 60,
  },
  sentenceTextDisplay: {
    fontSize: 18,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  controls: {
    marginTop: 16,
  },
  startBtn: {
    backgroundColor: '#6366f1',
  },
  stopBtn: {
    backgroundColor: '#ef4444',
  },
  actionBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  miniBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  primary: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  warning: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  danger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  miniBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
