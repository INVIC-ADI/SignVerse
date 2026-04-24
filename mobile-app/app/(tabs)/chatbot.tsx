import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Video, Audio } from 'expo-av';
import axios from 'axios';
import { CONFIG } from '@/constants/Config';

// Helper for translation
const translateText = async (text: string, target: string) => {
  try {
    const res = await axios.post(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.TRANSLATE}`, { text, target });
    return res.data.translated || text;
  } catch (err) {
    console.error('Translation error:', err);
    return text;
  }
};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  time: string;
}

export default function ChatbotScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hello! How can I help you today?', sender: 'bot', time: new Date().toLocaleTimeString() }
  ]);
  const [inputText, setInputText] = useState('');
  const [videoList, setVideoList] = useState<string[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isSTTLoading, setIsSTTLoading] = useState(false);
  const [isHindi, setIsHindi] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const videoRef = useRef<Video>(null);

  const sendMessage = async (text: string = inputText) => {
    if (!text.trim()) return;

    let messageToSend = text;
    if (isHindi) {
      console.log('Translating Hindi to English for Chatbot...');
      const translated = await translateText(text, 'English');
      messageToSend = translated;
    }

    const mode = isLocalMode ? 'local' : 'gemini';

    const newMessage: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      time: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    try {
      console.log(`[Mobile Chat] Connecting to ${CONFIG.BASE_URL}...`);
      const response = await axios.post(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.CHAT}`, {
        message: messageToSend,
        mode: mode
      }, { timeout: 30000 }); // 30s timeout for Ollama

      let botReply = response.data.reply;
      if (isHindi) {
        botReply = await translateText(botReply, 'Hindi');
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botReply,
        sender: 'bot',
        time: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, botMessage]);
      prepareVideos(response.data.reply);
    } catch (error: any) {
      console.error('[Chat Error]', error.message);
      const errorMsg = error.code === 'ECONNABORTED' ? 'LLM Timeout (30s exceeded)' : 
                       !error.response ? 'Network Error: Cannot connect to server' :
                       `Server Error: ${error.response.status}`;
                       
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: `⚠️ ${errorMsg}. Please check if Flask and Ollama are running.`,
        sender: 'bot',
        time: new Date().toLocaleTimeString()
      }]);
    }
  };

  const prepareVideos = async (text: string) => {
    const sanitized = text.toUpperCase().trim();
    const words = sanitized.split(/\s+/);
    const finalVideoList: string[] = [];

    for (const word of words) {
      const wordUrl = `${CONFIG.BASE_URL}/static/chatbot/avatar_videos/${word.toLowerCase()}.mp4`;
      
      try {
        // Use axios.head for more reliable existence check on mobile
        const check = await axios.head(wordUrl, { timeout: 3000 });
        if (check.status === 200) {
          finalVideoList.push(wordUrl);
          continue;
        }
      } catch (e) {
        // Word not found, fall back to letters
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

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish) {
      if (currentVideoIndex < videoList.length - 1) {
        // Move to next video
        setCurrentVideoIndex(prev => prev + 1);
      } else {
        // Finished the whole queue
        setIsPlaying(false);
      }
    }
  };

  // ================= STT RECORDING =================

  async function startRecording() {
    try {
      console.log('Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    console.log('Stopping recording..');
    if (!recording) return;

    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);
    
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
      const language_code = isHindi ? 'hin' : 'eng';
      const response = await axios.post(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.STT}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { language_code } // Pass as param or form field (backend handles both)
      });

      if (response.data.text) {
        let text = response.data.text.trim();
        
        let textToSign = text;
        if (isHindi) {
            console.log('Translating Hindi Speech to English for signing...');
            textToSign = await translateText(text, 'English');
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            text: `🎙️ ${text}`,
            sender: 'user',
            time: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, userMsg]);
        
        prepareVideos(textToSign);
      }
    } catch (error) {
      console.error('STT Upload Error:', error);
    } finally {
      setIsSTTLoading(false);
    }
  };

  const getFromSign = async () => {
    try {
      const res = await axios.get(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.SENTENCE}`);
      if (res.data.sentence) {
        setInputText(res.data.sentence);
      }
    } catch (error) {
      console.error('Fetch Sentence Error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SignVerse Chat</Text>
        <View style={styles.headerControls}>
          <TouchableOpacity 
              style={[styles.langToggle, isLocalMode ? styles.langToggleActive : null]}
              onPress={() => setIsLocalMode(!isLocalMode)}
          >
              <Text style={styles.langToggleText}>{isLocalMode ? 'Local LLM' : 'Gemini AI'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
              style={[styles.langToggle, isHindi ? styles.langToggleActive : null]}
              onPress={() => setIsHindi(!isHindi)}
          >
              <Text style={styles.langToggleText}>{isHindi ? 'हिन्दी (HI)' : 'English (EN)'}</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.placeholderText}>No animation playing</Text>
          </View>
        )}
      </View>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]}>
            <Text style={[styles.messageText, item.sender === 'user' ? styles.userText : styles.botText]}>{item.text}</Text>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
        )}
        contentContainerStyle={styles.chatList}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.signImportBtn} onPress={getFromSign}>
            <Text>✋</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity 
            style={[styles.micBtn, recording ? styles.micRecording : null]} 
            onPress={recording ? stopRecording : startRecording}
            disabled={isSTTLoading}
          >
            {isSTTLoading ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Text style={styles.micText}>{recording ? '⏹️' : '🎙️'}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366f1',
    textAlign: 'center',
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
  chatList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 15,
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: '#374151',
  },
  timeText: {
    fontSize: 10,
    opacity: 0.5,
    marginTop: 4,
    textAlign: 'right',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f2f5',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
  },
  signImportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sendBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  micRecording: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  micText: {
    fontSize: 20,
  },
  header: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  headerControls: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
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
});
