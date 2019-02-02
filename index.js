'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {
  StyleSheet,
  Dimensions,
  Vibration,
  Animated,
  Easing,
  View,
  Text,
  Platform,
  PermissionsAndroid,
} from 'react-native';

import Permissions from 'react-native-permissions';
import {RNCamera as Camera} from 'react-native-camera';
import * as Animatable from "react-native-animatable";

const PERMISSION_AUTHORIZED = 'authorized';
const CAMERA_PERMISSION = 'camera';
const SCREEN_WIDTH = Dimensions.get("window").width;
const rectDimensions = SCREEN_WIDTH * 0.65; // this is equivalent to 255 from a 393 device width
const rectBorderWidth = SCREEN_WIDTH * 0.005; // this is equivalent to 2 from a 393 device width
const scanBarWidth = SCREEN_WIDTH * 0.60; // this is equivalent to 180 from a 393 device width
const scanBarHeight = SCREEN_WIDTH * 0.005; //this is equivalent to 1 from a 393 device width

export default class QRCodeScanner extends Component {
  static propTypes = {
    onRead: PropTypes.func.isRequired,
    onMount: PropTypes.func,
    vibrate: PropTypes.bool,
    reactivate: PropTypes.bool,
    reactivateTimeout: PropTypes.number,
    fadeIn: PropTypes.bool,
    showMarker: PropTypes.bool,
    cameraType: PropTypes.oneOf(['front', 'back']),
    customMarker: PropTypes.element,
    containerStyle: PropTypes.any,
    cameraStyle: PropTypes.any,
    markerStyle: PropTypes.any,
    topViewStyle: PropTypes.any,
    bottomViewStyle: PropTypes.any,
    topContent: PropTypes.oneOfType([PropTypes.element, PropTypes.string]),
    bottomContent: PropTypes.oneOfType([PropTypes.element, PropTypes.string]),
    notAuthorizedView: PropTypes.element,
    permissionDialogTitle: PropTypes.string,
    permissionDialogMessage: PropTypes.string,
    checkAndroid6Permissions: PropTypes.bool,
    cameraProps: PropTypes.object,
  };

  static defaultProps = {
    onRead: () => console.log('QR code scanned!'),
    onMount: () => console.log('Loaded'),
    reactivate: false,
    vibrate: true,
    reactivateTimeout: 0,
    fadeIn: true,
    showMarker: false,
    cameraType: 'back',
    notAuthorizedView: (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            fontSize: 16,
          }}
        >
          Camera not authorized
        </Text>
      </View>
    ),
    pendingAuthorizationView: (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            fontSize: 16,
          }}
        >
          ...
        </Text>
      </View>
    ),
    permissionDialogTitle: 'Info',
    permissionDialogMessage: 'Need camera permission',
    checkAndroid6Permissions: false,
    cameraProps: {},
  };

  constructor(props) {
    super(props);
    this.state = {
      ready: false,
      scanning: false,
      fadeInOpacity: new Animated.Value(0),
      isAuthorized: false,
      isAuthorizationChecked: false,
      disableVibrationByUser: false,
    };

    this._handleBarCodeRead = this._handleBarCodeRead.bind(this);
  }

  componentWillMount() {
    if (Platform.OS === 'ios') {
      Permissions.request(CAMERA_PERMISSION).then(response => {
        this.setState({
          isAuthorized: response === PERMISSION_AUTHORIZED,
          isAuthorizationChecked: true,
        });
      });
    } else if (
      Platform.OS === 'android' &&
      this.props.checkAndroid6Permissions
    ) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: this.props.permissionDialogTitle,
        message: this.props.permissionDialogMessage,
      }).then(granted => {
        const isAuthorized =
          Platform.Version >= 23
            ? granted === PermissionsAndroid.RESULTS.GRANTED
            : granted === true;

        this.setState({isAuthorized, isAuthorizationChecked: true});
      });
    } else {
      this.setState({isAuthorized: true, isAuthorizationChecked: true});
    }
  }

  componentDidMount() {
    this.props.onMount();
    this.setState({ready: true});
    if (this.props.fadeIn) {
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(this.state.fadeInOpacity, {
          toValue: 1,
          easing: Easing.inOut(Easing.quad),
        }),
      ]).start();
    }
  }

  disable() {
    this.setState({disableVibrationByUser: true});
  }

  enable() {
    this.setState({disableVibrationByUser: false});
  }

  _setScanning(value) {
    this.setState({scanning: value});
  }

  _handleBarCodeRead(e) {
    if (!this.state.scanning && !this.state.disableVibrationByUser) {
      if (this.props.vibrate) {
        Vibration.vibrate();
      }
      this._setScanning(true);
      this.props.onRead(e);
      if (this.props.reactivate) {
        setTimeout(
          () => this._setScanning(false),
          this.props.reactivateTimeout
        );
      }
    }
  }

  _renderTopContent() {
    if (this.props.topContent) {
      return this.props.topContent;
    }
    return null;
  }

  _renderBottomContent() {
    if (this.props.bottomContent) {
      return this.props.bottomContent;
    }
    return null;
  }

  _scannerAnimation(translationType, fromValue) {
    return {
      from: {
        [translationType]: SCREEN_WIDTH * -0.18
      },
      to: {
        [translationType]: fromValue
      }
    };
  }

  _renderCameraMarker() {
    if (this.props.showMarker) {
      if (this.props.customMarker) {
        return this.props.customMarker;
      } else {
        return (
          <View style={styles.rectangleContainer}>
            <View style={styles.topOverlay}>
              {this._renderTopContent()}
            </View>
            <View style={{flexDirection: "row"}}>
              <View style={styles.leftAndRightOverlay}/>
              <View style={styles.rectangle}>
                {this.state.ready &&
                <Animatable.View
                  style={styles.scanBar}
                  direction="alternate-reverse"
                  iterationCount="infinite"
                  duration={1700}
                  easing="linear"
                  animation={this._scannerAnimation(
                    "translateY",
                    SCREEN_WIDTH * -0.8
                  )}
                  useNativeDriver={true}
                />
                }
              </View>
              <View style={styles.leftAndRightOverlay}/>
            </View>
            <View style={styles.bottomOverlay}>
              {this._renderBottomContent()}
            </View>
          </View>
        );
      }
    }
    return null;
  }

  _renderCamera() {
    const {
      notAuthorizedView,
      pendingAuthorizationView,
      cameraType,
    } = this.props;
    const {isAuthorized, isAuthorizationChecked} = this.state;
    if (isAuthorized) {
      if (this.props.fadeIn) {
        return (
          <Animated.View
            style={{
              opacity: this.state.fadeInOpacity,
              backgroundColor: 'transparent',
            }}
          >
            <Camera
              style={[styles.camera, this.props.cameraStyle]}
              onBarCodeRead={this._handleBarCodeRead.bind(this)}
              captureAudio={false}
              type={this.props.cameraType}
              {...this.props.cameraProps}
            >
              {this._renderCameraMarker()}
            </Camera>
          </Animated.View>
        );
      }
      return (
        <Camera
          type={cameraType}
          style={[styles.camera, this.props.cameraStyle]}
          onBarCodeRead={this._handleBarCodeRead.bind(this)}
          captureAudio={false}
          {...this.props.cameraProps}
        >
          {this._renderCameraMarker()}
        </Camera>
      );
    } else if (!isAuthorizationChecked) {
      return pendingAuthorizationView;
    } else {
      return notAuthorizedView;
    }
  }

  reactivate() {
    this._setScanning(false);
  }

  render() {
    return (
      <View style={[styles.mainContainer, this.props.containerStyle]}>
        <View style={[styles.infoView, this.props.topViewStyle]}>
          {this._renderTopContent()}
        </View>
        {this._renderCamera()}
        <View style={[styles.infoView, this.props.bottomViewStyle]}>
          {this._renderBottomContent()}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  infoView: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    width: Dimensions.get('window').width,
  },

  camera: {
    flex: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
  },

  rectangleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },

  rectangle: {
    height: rectDimensions,
    width: rectDimensions,
    borderWidth: rectBorderWidth,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    position: 'relative',
  },

  topOverlay: {
    flex: 1,
    height: SCREEN_WIDTH,
    width: SCREEN_WIDTH,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center"
  },

  bottomOverlay: {
    flex: 1,
    height: SCREEN_WIDTH,
    width: SCREEN_WIDTH,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: SCREEN_WIDTH * 0.25
  },

  leftAndRightOverlay: {
    height: SCREEN_WIDTH * 0.65,
    width: SCREEN_WIDTH,
    backgroundColor: "rgba(0,0,0,0.5)"
  },

  scanBar: {
    width: scanBarWidth,
    height: scanBarHeight,
    marginTop: SCREEN_WIDTH * 0.97,
    backgroundColor: "white"
  },
});
