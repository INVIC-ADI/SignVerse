import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Video, Audio } from 'expo-av';
import axios from 'axios';
import { CONFIG } from '@/constants/Config';

const translateText = async (text: string, target: string) => {
  try {
    const res = await axios.post(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.TRANSLATE}`, { text, target });
    return res.data.translated || text;
  } catch (err) {
    console.error('Translation error:', err);
    return text;
  }
};

export default function TranslatorScreen() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [videoList, setVideoList] = useState<string[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isSTTLoading, setIsSTTLoading] = useState(false);
  const videoRef = useRef<Video>(null);

  const prepareVideos = async (text: string) => {
    const sanitized = text.toUpperCase().trim();
    const words = sanitized.split(/\s+/);
    const finalVideoList: string[] = [];

    for (const word of words) {
      if (!word) continue;
      const wordUrl = `${CONFIG.BASE_URL}/static/chatbot/avatar_videos/${word.toLowerCase()}.mp4`;
      
      try {
        const check = await axios.head(wordUrl, { timeout: 3000 });
        if (check.status === 200) {
          finalVideoList.push(wordUrl);
          continue;
        }
      } catch (e) {
        // Fall back to characters if word video not found
      }

      for (const char of word) {
        if (char >= 'A' && char <= 'Z') {
          finalVideoList.push(`${CONFIG.BASE_URL}/static/chatbot/avatar_videos/${char.toLowerCase()}.mp4`);
        }
      }
    }

    if (finalVideoList.length > 0) {
      setVideoList(finalVideoList);
      setCurrentVideoIndex(0);
      setIsPlaying(true);
    }
  };

  const handleSignIt = () => {
    if (inputText.trim()) {
      prepareVideos(inputText);
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    const result = await translateText(inputText, 'Hindi');
    setTranslatedText(result);
  };

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish) {
      if (currentVideoIndex < videoList.length - 1) {
        setCurrentVideoIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }
  };

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) {
      uploadAudio(uri);
    }
  }

  const uploadAudio = async (uri: string) => {
    setIsSTTLoading(true);
    const formData = new FormData();
    // @ts-ignore
    formData.append('audio', {
      uri: uri,
      type: 'audio/wav',
      name: 'recording.wav',
    });

    try {
      const response = await axios.post(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.STT}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { language_code: 'eng' }
      });

      if (response.data.text) {
        const text = response.data.text.trim();
        setInputText(text);
        prepareVideos(text);
      }
    } catch (error) {
      console.error('STT Upload Error:', error);
    } finally {
      setIsSTTLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sign Translator</Text>
      </View>

      <View style={styles.videoContainer}>
        {videoList.length > 0 ? (
          <Video
            key={currentVideoIndex}
            ref={videoRef}
            source={{ uri: videoList[currentVideoIndex] }}
            style={styles.video}
            resizeMode="contain"
            shouldPlay={isPlaying}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.placeholderText}>Type text to see sign animation</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.contentArea} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Text Input</Text>
          <TextInput
            style={styles.inputArea}
            multiline
            numberOfLines={4}
            placeholder="Type text to convert to sign..."
            value={inputText}
            onChangeText={setInputText}
          />

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={handleSignIt}>
              <Text style={styles.btnText}>Sign It 🤟</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.btn, styles.secondaryBtn, recording ? styles.recordingBtn : null]} 
              onPress={recording ? stopRecording : startRecording}
              disabled={isSTTLoading}
            >
              {isSTTLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnText}>{recording ? 'Stop ⏹️' : 'Mic 🎙️'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.dangerBtn]} onPress={() => { setInputText(''); setTranslatedText(''); }}>
              <Text style={styles.btnText}>Clear ❌</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={[styles.btn, styles.outlineBtn]} onPress={handleTranslate}>
            <Text style={styles.outlineBtnText}>Translate to Hindi 🇮🇳</Text>
          </TouchableOpacity>

          {translatedText ? (
            <View style={styles.translatedBox}>
              <Text style={styles.translatedLabel}>Hindi Translation:</Text>
              <Text style={styles.translatedText}>{translatedText}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  videoContainer: {
    height: 250,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#6b7280',
    fontSize: 14,
  },
  contentArea: {
    padding: 16,
    paddingTop: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
  },
  inputArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: '#6366f1',
  },
  secondaryBtn: {
    backgroundColor: '#8b5cf6',
  },
  recordingBtn: {
    backgroundColor: '#ef4444',
  },
  dangerBtn: {
    backgroundColor: '#ef4444',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  outlineBtnText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 16,
  },
  translatedBox: {
    marginTop: 16,
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  translatedLabel: {
    fontSize: 12,
    color: '#6366f1',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 4,
  },
  translatedText: {
    fontSize: 18,
    color: '#312e81',
    fontWeight: '500',
  },
});
