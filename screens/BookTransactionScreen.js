import React from 'react';
import { Text,
   View,
   TouchableOpacity,
   TextInput,
   Image,
   StyleSheet,
  KeyboardAvoidingView ,
ToastAndroid,Alert} from 'react-native';
import * as Permissions from 'expo-permissions';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as firebase from 'firebase'
import db from '../config.js'
import { lessThan } from 'react-native-reanimated';

export default class TransactionScreen extends React.Component {
    constructor(){
      super();
      this.state = {
        hasCameraPermissions: null,
        scanned: false,
        scannedBookId: '',
        scannedStudentId:'',
        buttonState: 'normal',
        transactionMessage: ''
      }
    }

    getCameraPermissions = async (id) =>{
      const {status} = await Permissions.askAsync(Permissions.CAMERA);
      
      this.setState({
        /*status === "granted" is true when user has granted permission
          status === "granted" is false when user has not granted the permission
        */
        hasCameraPermissions: status === "granted",
        buttonState: id,
        scanned: false
      });
    }

    handleBarCodeScanned = async({type, data})=>{
      const {buttonState} = this.state
console.log(buttonState);
      if(buttonState==="bookId"){
        this.setState({
          scanned: true,
          scannedBookId: data,
          buttonState: 'normal'
        });
      }
      else if(buttonState==="studentId"){
        this.setState({
          scanned: true,
          scannedStudentId: data,
          buttonState: 'normal'
        });
      }
      
    }

    initiateBookIssue = async()=>{
      //add a transaction
      db.collection("transactions").add({
        'studentId': this.state.scannedStudentId,
        'bookId' : this.state.scannedBookId,
        'date' : firebase.firestore.Timestamp.now().toDate(),
        'transactionType': "Issue"
      })
      //change book status
      db.collection("books").doc(this.state.scannedBookId).update({
        'bookAvailability': false
      })
      //change number  of issued books for student
      db.collection("students").doc(this.state.scannedStudentId).update({
        'numberOfBooksIssued': firebase.firestore.FieldValue.increment(1)
      })
    }

    initiateBookReturn = async()=>{
      //add a transaction
      db.collection("transactions").add({
        'studentId': this.state.scannedStudentId,
        'bookId' : this.state.scannedBookId,
        'date' : firebase.firestore.Timestamp.now().toDate(),
        'transactionType': "Return"
      })
      //change book status
      db.collection("books").doc(this.state.scannedBookId).update({
        'bookAvailability': true
      })
      //change number  of issued books for student
      db.collection("students").doc(this.state.scannedStudentId).update({
        'numberOfBooksIssued': firebase.firestore.FieldValue.increment(-1)
      })
    }


    checkStudentEligibilityForBookIssue = async() =>{
      const studentRef = await db 
      .collection('students')
      .where("studentId","==",this.state.scannedStudentId)
      .get();
      var isStudentEligibile = "";
      if (studentRef.docs.length === 0) {
        this.setState({
          scannedStudentId : "",
          scannedBookId : ""
          
        })
        isStudentEligibile = false;
        Alert.alert("Student Id Does Not Exist In The Database")
      }
      else {studentRef.docs.map(doc => {
        var student = doc.data();
        if (student.numberOfBooksIssued<2){
          isStudentEligibile = true;
        }
        else {
          isStudentEligibile = false;
          Alert.alert("Student Already Issued Two Books");
          this.setState({
            scannedStudentId : "",
            scannedBookId : ""
            
          })
        }
      })}
      return isStudentEligible;
    }

    checkStudentEligibilityForBookReturn = async() =>{
      const transactionRef = await db 
      .collection('transactions')
      .where("bookId","==",this.state.scannedBookId)
      .limit(1)
      .get();
      var isStudentEligibile = "";
      transactionRef.docs.map(doc => {
        var lastBookTransaction = doc.data();
        if (lastBookTransaction.studentId === this.state.scannedStudentId) {
          isStudentEligibile = true;
      
        }
        else {isStudentEligibile = false;}
        Alert.alert("The Book Was Not Issued By This Student");
        this.setState({
          scannedStudentId : "",
          scannedBookId : ""
          
        })
      })
      return isStudentEligibile
    }

    checkBookEligibility = async() => {
      const bookRef = await db 
      .collection("books")
      .where("bookId","==",this.state.scannedBookId)
      .get();
      var transactionType = "";
      if (bookRef.docs.length == 0) {
        transactionType = false;

      }
      else {bookRef.docs.map(doc => {
        var book = doc.data();
        if (book.bookAvailability){
          transactionType = "issue";
      
        }
        else {transactionType = "return"};

      })}
      return transactionType;
    }

    handleTransaction = async () => {
      
      var transactionType = await this.checkBookEligibility();
      if (!transactionType){
        Alert.alert("The Book Does Not Exist In The Library Database.");
        this.setState({
          scannedStudentId : "",
          scannedBookId : ""
        })
      }                    
      else if (transactionType === "issue"){
        var isStudentEligibile = await this.checkStudentEligibilityForBookIssue();
        if (isStudentEligibile){
          this.initiateBookIssue();
          Alert.alert("Book Issued To The Student")
        
        } 
        else{
          var isStudentEligibile = await this.checkStudentEligibilityForBookReturn();
          if (isStudentEligibile){
            this.initiateBookReturn();
            Alert.alert("Book Returned To The Library")
          }
        }
      }

    }
    

    render() {
      const hasCameraPermissions = this.state.hasCameraPermissions;
      const scanned = this.state.scanned;
      const buttonState = this.state.buttonState;

      if (buttonState !== "normal" && hasCameraPermissions){
        return(
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        );
      }

      else if (buttonState === "normal"){
        return(
          <KeyboardAvoidingView  style={styles.container} behavior="padding" enabled>
            <View>
              <Image
                source={require("../assets/booklogo.jpg")}
                style={{width:200, height: 200}}/>
              <Text style={{textAlign: 'center', fontSize: 30}}>Wily</Text>
            </View>
            <View style={styles.inputView}>
            <TextInput 
              style={styles.inputBox}
              placeholder="Book Id"
              onChangeText={text =>this.setState({scannedBookId:text})}
              value={this.state.scannedBookId}/>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={()=>{
                this.getCameraPermissions("bookId")
              }}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
            </View>

            <View style={styles.inputView}>
            <TextInput 
              style={styles.inputBox}
              placeholder="Student Id"
              onChangeText ={text => this.setState({scannedStudentId:text})}
              value={this.state.scannedStudentId}/>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={()=>{
                this.getCameraPermissions("studentId")
              }}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={async()=>{
               this.handleTransaction();
                
              }}>
          <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        );
      }
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    displayText:{
      fontSize: 15,
      textDecorationLine: 'underline'
    },
    scanButton:{
      backgroundColor: '#2196F3',
      padding: 10,
      margin: 10
    },
    buttonText:{
      fontSize: 15,
      textAlign: 'center',
      marginTop: 10
    },
    inputView:{
      flexDirection: 'row',
      margin: 20
    },
    inputBox:{
      width: 200,
      height: 40,
      borderWidth: 1.5,
      borderRightWidth: 0,
      fontSize: 20
    },
    scanButton:{
      backgroundColor: '#66BB6A',
      width: 50,
      borderWidth: 1.5,
      borderLeftWidth: 0
    },
    submitButton:{
      backgroundColor: '#FBC02D',
      width: 100,
      height:50
    },
    submitButtonText:{
      padding: 10,
      textAlign: 'center',
      fontSize: 20,
      fontWeight:"bold",
      color: 'white'
    }
  });