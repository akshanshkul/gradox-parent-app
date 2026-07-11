import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  Alert,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Wallet,
  Info,
  CreditCard,
  History,
  Calendar,
  ChevronRight,
  TrendingDown,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  X,
  ShieldCheck,
  Trophy,
  Dna,
  Music,
  Download,
  Receipt,
  CheckCircle,
  Hash
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight, FadeInDown, SlideInUp, FadeIn, ZoomIn, FadeOutUp } from 'react-native-reanimated';
import RazorpayCheckout from 'react-native-razorpay';
import { apiCache } from '../../utils/cache';
import api from '../../utils/api';
import { getSchoolData, getUser } from '../../utils/auth';

const { width, height } = Dimensions.get('window');

export default function Fees() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any[]>([]); // This will now hold backend 'assignments'
  const [history, setHistory] = useState<any[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<any>(null); // For top-level summary
  const [isModalVisible, setModalVisible] = useState(false);
  const [isStructureVisible, setStructureVisible] = useState(false);
  const [isReceiptVisible, setReceiptVisible] = useState(false);
  const [selectedFeeType, setSelectedFeeType] = useState<any>(null);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);


  const router = useRouter();

  useEffect(() => {
    fetchFeesData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);


  const fetchFeesData = async (force = false) => {
    const cacheKey = 'student_fees_ledger_v2';
    const cached = force ? null : apiCache.get(cacheKey);
    if (cached) {
      setSummary(cached.assignments);
      setHistory(cached.history);
      setLedgerSummary(cached.summary);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response: any = await api.get('/students/fees/ledger');
      const data = response;

      const mappedAssignments = (data.assignments || []).map((a: any) => ({
        id: a.id,
        amount: a.installment_amount,
        paid: a.paid_amount,
        due: a.due_amount,
        current_installment_due: a.current_installment_due,
        waived: a.waived_amount,
        status: a.status,
        is_installment_paid: a.is_installment_paid,
        pending_months_count: a.pending_months_count,
        due_day: a.due_day,
        title: a.name,
        frequency: a.frequency,
        color: '#4f46e5',
        icon: a.is_installment_paid ? CheckCircle2 : Clock
      }));

      const mappedHistory = (data.history || []).map((t: any) => ({
        id: t.id,
        type: 'fee',
        title: t.fee_type || 'Fee Payment',
        amount: t.amount,
        date: new Date(t.date).toLocaleDateString(),
        status: 'paid',
        mode: t.method.toUpperCase(),
        ref: t.receipt_no,
        time: new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));

      setSummary(mappedAssignments);
      setHistory(mappedHistory);
      setLedgerSummary(data.summary);
      apiCache.set(cacheKey, { assignments: mappedAssignments, history: mappedHistory, summary: data.summary });
    } catch (error) {
      console.error('Failed to fetch fees ledger', error);
      Alert.alert('Error', 'Could not load your fee ledger.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeesData(true);
  };

  const handlePayment = async () => {
    if (!selectedFeeType) return;

    const amountToPay = parseFloat(paymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to pay.');
      setIsProcessing(false);
      return;
    }

    // Minimum Pending Validation
    const minPending = selectedFeeType.current_installment_due;
    if (amountToPay < minPending - 0.01 && selectedFeeType.due > 0.01) {

      Alert.alert('Insufficient Amount', `Minimum required to clear current dues is ₹${minPending.toFixed(2)}. Please pay at least this amount or contact school.`);
      setIsProcessing(false);
      return;
    }

    // Maximum Session Validation
    if (amountToPay > selectedFeeType.due + 0.01) {
      Alert.alert('Excess Amount', `You cannot pay more than the total remaining dues (₹${selectedFeeType.due.toFixed(2)}).`);
      setIsProcessing(false);
      return;
    }

    try {
      // 1. Initiate Order
      const initRes = await api.post('/students/payments/initiate', {
        fee_assignment_id: selectedFeeType.id,
        amount: amountToPay
      });

      const order = initRes.data.data;

      // 2. Open Razorpay - Robust Branding Lookup
      const [school, user] = await Promise.all([getSchoolData(), getUser()]);
      
      const schoolName = school?.name || user?.school_name ||  'Gradox';
      const schoolLogo = school?.logo_path || school?.logo || user?.school_logo || '';

      const options = {
        description: `Payment for ${selectedFeeType.title}`,
        image: schoolLogo,
        currency: order.currency,
        key: order.razorpay_key, 
        amount: order.amount,
        name: schoolName,
        order_id: order.order_id,
        notes: {
          student_id: user?.id || 'unknown',
          student_name: user?.name || 'Unknown Student',
          fee_assignment_id: selectedFeeType.id,
          fee_title: selectedFeeType.title
        },
        prefill: {
          email: '',
          contact: '',
          name: ''
        },
        theme: { color: '#4f46e5' }
      };

      RazorpayCheckout.open(options).then(async (data: any) => {
        // 3. Verify Payment
        try {
          const res = await api.post('/students/payments/verify', {
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
            fee_assignment_id: selectedFeeType.id,
            amount: amountToPay
          });

          // Wrap in timeout to prevent "ScreenContentWrapper" null child crash on Android
          setTimeout(() => {
            setModalVisible(false);
          }, 150);
          
          const receiptNo = res.data.receipt_no || 'N/A';
          setToast({ 
            message: `Payment of ₹${amountToPay} successful! Receipt: ${receiptNo}`, 
            type: 'success' 
          });
          onRefresh();


        } catch (e: any) {
          setToast({ message: e.response?.data?.message || 'Payment failed verification', type: 'error' });
        }
      }).catch((error: any) => {
        console.log('Payment Error Object:', JSON.stringify(error, null, 2));
        
        let displayMessage = error.description || error.message || 'Payment failed';

        // If description is a JSON string, try to parse it to get a better message
        if (typeof error.description === 'string' && error.description.startsWith('{')) {
          try {
            const parsed = JSON.parse(error.description);
            if (parsed.error && parsed.error.description && parsed.error.description !== 'undefined') {
              displayMessage = parsed.error.description;
            } else if (parsed.error && parsed.error.reason) {
              // Convert reason_code to Friendly Message
              displayMessage = parsed.error.reason.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
            }
          } catch (e) {
            // Keep original displayMessage if parsing fails
          }
        }

        const isCancelled = error.code === 2 || 
                           error.code === '2' || 
                           error.code === 0 || 
                           error.code === '0' ||
                           displayMessage.toLowerCase().includes('cancel');

        if (isCancelled) {
          setToast({ message: 'You cancelled the payment process.', type: 'info' });
        } else {
          // If the message is still "undefined" or JSON-like, use a generic friendly message
          if (displayMessage === 'undefined' || displayMessage.startsWith('{')) {
            displayMessage = 'Payment could not be completed at this time.';
          }
          setToast({ message: displayMessage, type: 'error' });
        }
        setIsProcessing(false);
        
        // Wrap in timeout to prevent "ScreenContentWrapper" null child crash on Android
        setTimeout(() => {
          setModalVisible(false);
        }, 150);
      });






    } catch (error: any) {
      console.error('Initiation Error:', error);
      setToast({ message: 'Failed to initiate payment. Please try again.', type: 'error' });
    } finally {

      setIsProcessing(false);
    }
  };

  const viewReceipt = (item: any) => {
    setActiveReceipt(item);
    setReceiptVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'overdue': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'monthly': return <Clock size={16} stroke="#4f46e5" />;
      case 'exam': return <CreditCard size={16} stroke="#8b5cf6" />;
      case 'fine': return <AlertCircle size={16} stroke="#ef4444" />;
      case 'event': return <TrendingDown size={16} stroke="#f59e0b" />;
      case 'admission': return <CheckCircle2 size={16} stroke="#10b981" />;
      case 'sports': return <Trophy size={16} stroke="#10b981" />;
      case 'science': return <Dna size={16} stroke="#3b82f6" />;
      case 'culture': return <Music size={16} stroke="#ec4899" />;
      default: return <Wallet size={16} stroke="#64748b" />;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft stroke="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Student Ledger</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.payNowBtn}>
              <CreditCard size={18} stroke="#4f46e5" />
              <Text style={styles.payNowText}>Pay Online</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => setStructureVisible(true)} style={styles.viewDetailsBtn}>
              <Info size={16} stroke="#fff" />
              <Text style={styles.viewDetailsText}>View Detailed Schedule</Text>
            </TouchableOpacity>

            {ledgerSummary && (
              <View style={styles.ledgerHeaderRow}>
                <View style={styles.ledgerHeaderItem}>
                  <Text style={styles.ledgerHeaderLabel}>Total Fees</Text>
                  <Text style={styles.ledgerHeaderValue}>₹{ledgerSummary.total_fees}</Text>
                </View>
                <View style={styles.ledgerHeaderDivider} />
                <View style={styles.ledgerHeaderItem}>
                  <Text style={styles.ledgerHeaderLabel}>Total Paid</Text>
                  <Text style={styles.ledgerHeaderValue}>₹{ledgerSummary.total_paid}</Text>
                </View>
                <View style={styles.ledgerHeaderDivider} />
                <View style={styles.ledgerHeaderItem}>
                  <Text style={[styles.ledgerHeaderLabel, { color: '#fff' }]}>Remaining</Text>
                  <Text style={[styles.ledgerHeaderValue, { color: '#bef264' }]}>₹{ledgerSummary.total_due}</Text>
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
        }
      >
        <View style={styles.scrollInside}>
          {/* Summary Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.summaryScroll}
            snapToAlignment="start"
            decelerationRate="fast"
          >
            {summary.map((item: any, index: number) => (
              <Animated.View
                key={item.id}
                entering={FadeInRight.delay(index * 100)}
                style={styles.summaryCard}
              >
                <View style={[styles.cardIconBox, { backgroundColor: `${item.color}10` }]}>
                  <item.icon size={20} stroke={item.color} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardFrequency}>{item.frequency?.replace('_', ' ')}</Text>
                  </View>
                </View>
                <Text style={styles.cardAmount}>₹{item.due > 0 ? item.due : item.amount}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.is_installment_paid ? '#10b98120' : '#ef444420' }]}>
                  {item.is_installment_paid && <CheckCircle2 size={10} stroke="#10b981" style={{ marginRight: 4 }} />}
                  <Text style={[styles.statusText, { color: item.is_installment_paid ? '#10b981' : '#ef4444' }]}>
                    {item.is_installment_paid ? 'PAID' : (item.pending_months_count > 1 ? `PENDING (${item.pending_months_count})` : 'PENDING')}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </ScrollView>

          <View style={styles.content}>
            {/* Activity Section */}
            <View style={styles.historySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Payment History</Text>
                <History size={18} stroke="#94a3b8" />
              </View>

              {history.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInRight.delay(index * 100)}
                >
                  <TouchableOpacity
                    style={styles.historyCard}
                    onPress={() => viewReceipt(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.historyIcon}>
                      {getTypeIcon(item.type)}
                    </View>
                    <View style={styles.historyDetails}>
                      <Text style={styles.historyTitle}>{item.title}</Text>
                      <View style={styles.historyMeta}>
                        <Calendar size={12} stroke="#94a3b8" />
                        <Text style={styles.historyMetaText}>{item.date}</Text>
                        <View style={styles.dot} />
                        <Text style={styles.historyMetaText}>{item.mode}</Text>
                      </View>
                    </View>
                    <View style={styles.historyAction}>
                      <Text style={styles.historyAmount}>₹{item.amount}</Text>
                      <ChevronRight size={16} stroke="#cbd5e1" />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !isProcessing && setModalVisible(false)}
        >
          <Pressable style={{ width: '100%', alignItems: 'center' }}>
            <Animated.View
              entering={SlideInUp}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Select Fee Category</Text>
                  <Text style={styles.modalSubtitle}>Choose what you want to pay for</Text>
                </View>
                <TouchableOpacity
                  disabled={isProcessing}
                  onPress={() => setModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <X size={20} stroke="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.feeTypeGrid}>
                {summary.filter(s => s.status !== 'paid').map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.feeTypeItem,
                      selectedFeeType?.id === item.id && styles.feeTypeItemSelected
                    ]}
                    onPress={() => {
                      setSelectedFeeType(item);
                      // Suggest the current debt primarily. If caught up, suggest 1 installment.
                      const suggested = item.current_installment_due > 0
                        ? item.current_installment_due
                        : item.amount;
                      setPaymentAmount(suggested.toString());
                    }}
                    disabled={isProcessing}
                  >
                    <View style={[styles.feeTypeIconBox, { backgroundColor: '#4f46e5' + '15' }]}>
                      {getTypeIcon(item.title.split(' ')[0])}
                    </View>
                    <Text numberOfLines={1} style={[
                      styles.feeTypeLabel,
                      selectedFeeType?.id === item.id && styles.feeTypeLabelSelected
                    ]}>{item.title}</Text>
                    <Text style={styles.feeTypeAmount}>₹{item.amount}</Text>
                  </TouchableOpacity>
                ))}

                {summary.filter(s => s.status !== 'paid').length === 0 && (
                  <View style={styles.noDuesContainer}>
                    <CheckCircle2 size={48} stroke="#10b981" />
                    <Text style={styles.noDuesText}>Everything is paid! No pending dues.</Text>
                  </View>
                )}
              </View>

              {selectedFeeType && (
                <View style={styles.amountCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.amountLabel}>Payable Amount (INR)</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      keyboardType="numeric"
                      placeholder="Enter amount"
                      editable={!isProcessing}
                    />
                    <Text style={styles.amountHint}>
                      Balance: ₹{selectedFeeType.due} | Current Debt: ₹{selectedFeeType.current_installment_due}
                    </Text>
                  </View>
                  <View style={styles.securityBadge}>
                    <ShieldCheck size={16} stroke="#10b981" />
                    <Text style={styles.securityText}>Secure</Text>
                  </View>
                </View>
              )}

              {selectedFeeType && (
                <TouchableOpacity
                  style={styles.paySubmitBtn}
                  onPress={handlePayment}
                  disabled={isProcessing}
                >
                  <LinearGradient
                    colors={['#4f46e5', '#6366f1']}
                    style={styles.paySubmitGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.paySubmitText}>Confirm Payment of ₹{paymentAmount}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <Text style={styles.paymentDisclaimer}>
                By proceeding, you agree to our terms of digital fee settlement.
              </Text>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Fee Structure Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isStructureVisible}
        onRequestClose={() => setStructureVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setStructureVisible(false)}
        >
          <Animated.View
            entering={FadeInDown}
            style={styles.structureModalWrapper}
          >
            <View style={styles.structureHeader}>
              <View>
                <Text style={styles.structureTitle}>Fee Breakdown</Text>
                <Text style={styles.structureSubtitle}>Session 2025-26 Overview</Text>
              </View>
              <TouchableOpacity onPress={() => setStructureVisible(false)} style={styles.closeBtn}>
                <X size={20} stroke="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.structureScroll}>
              {/* Group 1: Recurring Fees */}
              <View style={styles.structureGroup}>
                <View style={styles.groupHeader}>
                  <Clock size={16} stroke="#4f46e5" />
                  <Text style={styles.groupHeaderText}>Recurring Monthly Fees</Text>
                </View>
                <View style={styles.table}>
                  {summary.filter(s => s.frequency === 'monthly').map((item) => (
                    <View key={item.id} style={styles.tableRow}>
                      <View style={styles.rowLabelCell}>
                        <Text style={styles.rowTitle}>{item.title}</Text>
                        <Text style={styles.rowSubtitle}>₹{item.amount}/month × 12</Text>
                      </View>
                      <Text style={styles.rowValue}>₹{item.amount * 12}</Text>
                    </View>
                  ))}
                  {summary.filter(s => s.frequency === 'monthly').length === 0 && (
                    <Text style={styles.emptyGroupText}>No recurring fees assigned</Text>
                  )}
                </View>
              </View>

              {/* Group 2: Fixed Fees */}
              <View style={styles.structureGroup}>
                <View style={styles.groupHeader}>
                  <ShieldCheck size={16} stroke="#10b981" />
                  <Text style={styles.groupHeaderText}>One-Time & Academic Fees</Text>
                </View>
                <View style={styles.table}>
                  {summary.filter(s => s.frequency !== 'monthly').map((item) => (
                    <View key={item.id} style={styles.tableRow}>
                      <View style={styles.rowLabelCell}>
                        <Text style={styles.rowTitle}>{item.title}</Text>
                        <Text style={styles.rowSubtitle}>{item.frequency?.replace('_', ' ')} Fee</Text>
                      </View>
                      <Text style={styles.rowValue}>₹{item.amount}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.totalSummaryBox}>
                <View style={styles.totalSummaryRow}>
                  <Text style={styles.totalSummaryLabel}>Gross Academic Commitment</Text>
                  <Text style={styles.totalSummaryValue}>₹{ledgerSummary?.total_fees}</Text>
                </View>
                <Text style={styles.totalSummaryDisclaimer}>
                  Values include all academic components as assigned by school management.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.structureCloseBtn}
              onPress={() => setStructureVisible(false)}
            >
              <Text style={styles.structureCloseText}>Got it, Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Receipt Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isReceiptVisible}
        onRequestClose={() => setReceiptVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setReceiptVisible(false)}
        >
          <Animated.View
            entering={ZoomIn.duration(300)}
            style={styles.receiptContainer}
          >
            <View style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <View style={styles.receiptIcon}>
                  <CheckCircle size={32} stroke="#10b981" fill="rgba(16, 185, 129, 0.1)" />
                </View>
                <Text style={styles.receiptStatus}>Payment Successful</Text>
                <Text style={styles.receiptAmount}>₹{activeReceipt?.amount}</Text>
                <Text style={styles.receiptTitle}>{activeReceipt?.title}</Text>
              </View>

              <View style={styles.receiptDivider}>
                <View style={styles.receiptDotLeft} />
                <View style={styles.receiptDash} />
                <View style={styles.receiptDotRight} />
              </View>

              <View style={styles.receiptBody}>
                <View style={styles.receiptRow}>
                  <View style={styles.receiptLabelGroup}>
                    <Calendar size={14} stroke="#94a3b8" />
                    <Text style={styles.receiptLabel}>Paid On</Text>
                  </View>
                  <Text style={styles.receiptValue}>{activeReceipt?.date}, {activeReceipt?.time}</Text>
                </View>

                <View style={styles.receiptRow}>
                  <View style={styles.receiptLabelGroup}>
                    <Hash size={14} stroke="#94a3b8" />
                    <Text style={styles.receiptLabel}>Transaction Ref</Text>
                  </View>
                  <Text style={styles.receiptValue}>{activeReceipt?.ref}</Text>
                </View>

                <View style={styles.receiptRow}>
                  <View style={styles.receiptLabelGroup}>
                    <Wallet size={14} stroke="#94a3b8" />
                    <Text style={styles.receiptLabel}>Payment Method</Text>
                  </View>
                  <Text style={styles.receiptValue}>{activeReceipt?.mode}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => {
                  setReceiptVisible(false);
                  Alert.alert('Download Started', 'Your formal receipt is being generated.');
                }}
              >
                <Download size={18} stroke="#fff" />
                <Text style={styles.downloadText}>Download Receipt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.receiptCloseTextBtn}
                onPress={() => setReceiptVisible(false)}
              >
                <Text style={styles.receiptCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Dynamic Toast Notification */}
      {toast && (
        <Animated.View 
          entering={FadeInUp} 
          exiting={FadeOutUp}
          style={[styles.toastContainer, { top: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 60 }]}
        >
          <LinearGradient
            colors={['#ffffff', '#ffffff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.toastGradient, { borderWidth: 1, borderColor: '#e2e8f0' }]}
          >
            <View style={styles.toastContent}>
              {toast.type === 'success' && <CheckCircle size={18} stroke="#10b981" />}
              {toast.type === 'error' && <AlertCircle size={18} stroke="#ef4444" />}
              {toast.type === 'info' && <Info size={18} stroke="#4f46e5" />}
              <Text style={[styles.toastText, { color: '#1e293b' }]}>
                {toast.message}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

      )}
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  payNowText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#4f46e5',
  },
  headerContent: {
    paddingHorizontal: 25,
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Inter_400Regular',
  },
  scrollView: {
    flex: 1,
  },
  scrollInside: {
    marginTop: 25,
  },
  summaryScroll: {
    paddingHorizontal: 20,
    gap: 15,
    paddingBottom: 10,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    opacity: 0.9,
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    textDecorationLine: 'underline',
  },
  structureModalWrapper: {
    width: width * 1,
    maxHeight: height * 1,
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  structureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  structureTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
  },
  structureSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  structureScroll: {
    paddingBottom: 20,
  },
  structureGroup: {
    marginBottom: 25,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  groupHeaderText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  table: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 4,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowLabelCell: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  rowValue: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
  },
  totalSummaryBox: {
    marginTop: 10,
    padding: 20,
    backgroundColor: '#4f46e5' + '08',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#4f46e5' + '20',
  },
  totalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalSummaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#4f46e5',
  },
  totalSummaryValue: {
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
    color: '#4f46e5',
  },
  totalSummaryDisclaimer: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  structureCloseBtn: {
    marginTop: 10,
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  structureCloseText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  content: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  summaryCard: {
    width: width * 0.42,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#64748b',
    marginBottom: 2,
    textAlign: 'center',
  },
  cardFrequency: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
    opacity: 0.8,
  },
  cardAmount: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  historySection: {
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  historyDetails: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#334155',
    marginBottom: 4,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyMetaText: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter_400Regular',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#cbd5e1',
  },
  historyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyAmount: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
  },
  // Main Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 25,
    maxHeight: height * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feeTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  feeTypeItem: {
    width: (width - 62) / 2,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
  },
  feeTypeItemSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#f5f3ff',
  },
  feeTypeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  feeTypeLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#64748b',
  },
  feeTypeLabelSelected: {
    color: '#4f46e5',
  },
  feeTypeAmount: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#64748b',
    marginTop: 2,
  },
  noDuesContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  noDuesText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#64748b',
    textAlign: 'center',
  },
  subCategorySection: {
    marginBottom: 25,
  },
  subSectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#334155',
    marginBottom: 12,
  },
  subItemScroll: {
    gap: 10,
  },
  subItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
  },
  subItemChipSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  subItemText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#64748b',
  },
  subItemTextSelected: {
    color: '#fff',
  },
  amountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  amountInput: {
    fontSize: 24,
    color: '#fff',
    fontFamily: 'Inter_800ExtraBold',
    padding: 0,
    margin: 0,
  },
  amountHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#10b981',
  },
  paySubmitBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 15,
  },
  paySubmitGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paySubmitText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  paymentDisclaimer: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  // Receipt Modal Styles
  receiptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 10,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  receiptIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  receiptStatus: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#10b981',
    marginBottom: 10,
  },
  receiptAmount: {
    fontSize: 36,
    fontFamily: 'Inter_800ExtraBold',
    color: '#1e293b',
    marginBottom: 4,
  },
  receiptTitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#64748b',
  },
  receiptDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '120%',
    marginVertical: 20,
  },
  receiptDotLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginLeft: -10,
  },
  receiptDash: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 10,
  },
  receiptDotRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginRight: -10,
  },
  receiptBody: {
    width: '100%',
    gap: 15,
    marginBottom: 25,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontFamily: 'Inter_500Medium',
  },
  receiptValue: {
    fontSize: 13,
    color: '#334155',
    fontFamily: 'Inter_600SemiBold',
  },
  downloadBtn: {
    width: '100%',
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 10,
    marginBottom: 15,
  },
  downloadText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  receiptCloseTextBtn: {
    padding: 10,
  },
  receiptCloseText: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'Inter_600SemiBold',
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 15,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ledgerHeaderItem: {
    flex: 1,
    alignItems: 'center',
  },
  ledgerHeaderLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  ledgerHeaderValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  ledgerHeaderDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  toastGradient: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  emptyGroupText: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    paddingVertical: 15,
  },
});

