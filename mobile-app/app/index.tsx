import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function LandingScreen() {
  const router = useRouter();

  const handleStart = () => {
    // Navigate to the chatbot tab
    router.replace('/(tabs)/chatbot');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Background "Orbs" for aesthetics */}
        <View style={styles.orb1} />
        <View style={styles.orb2} />

        <View style={styles.navbar}>
          <Text style={styles.navBrand}>SignVerse</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✦ New · Sign Language AI Platform</Text>
          </View>
          
          <Text style={styles.eyebrow}>The future of silent communication</Text>
          
          <Text style={styles.titleLine}>Speak Without</Text>
          <Text style={styles.titleMain}>WORDS</Text>
          <Text style={styles.titleLine}>Connect With Everyone.</Text>

          <Text style={styles.heroSub}>
            SignVerse uses real-time AI to bridge the gap between sign language and spoken language — empowering communication for all.
          </Text>

          <View style={styles.ctaContainer}>
            <TouchableOpacity style={styles.primaryCta} onPress={handleStart}>
              <Text style={styles.primaryCtaText}>Start Signing Free →</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.floaters}>
             <View style={styles.floaterBadge}><Text style={styles.floaterText}>🤟 Sign Language</Text></View>
             <View style={styles.floaterBadge}><Text style={styles.floaterText}>🤖 AI Powered</Text></View>
             <View style={styles.floaterBadge}><Text style={styles.floaterText}>🌍 Multilingual</Text></View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>99%</Text>
            <Text style={styles.statDesc}>Prediction Accuracy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>2</Text>
            <Text style={styles.statDesc}>Languages</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>&lt;1s</Text>
            <Text style={styles.statDesc}>Detection</Text>
          </View>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionBadge}>Core Capabilities</Text>
          <Text style={styles.sectionTitle}>Everything You Need</Text>
          
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🤖</Text>
            <Text style={styles.featureTitle}>Gemini AI Chatbot</Text>
            <Text style={styles.featureSub}>Natural conversations powered by Google Gemini — sign, type, or speak.</Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🔄</Text>
            <Text style={styles.featureTitle}>Translator Mode</Text>
            <Text style={styles.featureSub}>Dedicated workspace for Text→Sign and Sign→Text with camera integration.</Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🌍</Text>
            <Text style={styles.featureTitle}>Hindi & English</Text>
            <Text style={styles.featureSub}>Seamlessly switch between English and Hindi across all interfaces.</Text>
          </View>
        </View>

        <View style={{height: 100}} />
      </ScrollView>

      {/* Floating Bottom Button for easy access */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomCta} onPress={handleStart}>
          <Text style={styles.bottomCtaText}>Get Started Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Deep dark blue/purple matching Web app
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  orb1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  orb2: {
    position: 'absolute',
    top: 200,
    right: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  navbar: {
    paddingVertical: 10,
    marginBottom: 20,
  },
  navBrand: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  hero: {
    marginTop: 20,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  badgeText: {
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: '700',
  },
  eyebrow: {
    color: '#94a3b8',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 10,
  },
  titleLine: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
  },
  titleMain: {
    fontSize: 48,
    fontWeight: '900',
    color: '#c4b5fd',
    textAlign: 'center',
    marginVertical: 5,
  },
  heroSub: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 20,
    paddingHorizontal: 10,
  },
  ctaContainer: {
    marginTop: 30,
    width: '100%',
    alignItems: 'center',
  },
  primaryCta: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryCtaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  floaters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 30,
  },
  floaterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  floaterText: {
    color: '#e2e8f0',
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 20,
    marginTop: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  statDesc: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    height: '80%',
    alignSelf: 'center',
  },
  featuresSection: {
    marginTop: 50,
  },
  sectionBadge: {
    color: '#c4b5fd',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  featureSub: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  bottomCta: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bottomCtaText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
});
