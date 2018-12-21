import { EventEmitter, Platform, PermissionsAndroid } from "react-native";
import {
  LocationPermissionStatus,
  Subscription,
  RNLocationNativeInterface,
  RequestPermissionOptions
} from "../types";

/**
 * Internal helper class for managing permissions
 * @ignore
 */
export default class Permissions {
  private nativeInterface: RNLocationNativeInterface;
  private eventEmitter: EventEmitter;

  public constructor(
    nativeInterface: RNLocationNativeInterface,
    eventEmitter: EventEmitter
  ) {
    this.nativeInterface = nativeInterface;
    this.eventEmitter = eventEmitter;
  }

  public async requestPermission(
    options: RequestPermissionOptions
  ): Promise<boolean> {
    switch (Platform.OS) {
      // iOS Permissions
      case "ios": {
        if (options.ios === "always") {
          return await this.nativeInterface.requestAlwaysAuthorization();
        } else if (options.ios === "whenInUse") {
          return await this.nativeInterface.requestWhenInUseAuthorization();
        }
        return false;
      }
      // Android permissions
      case "android": {
        if (!options.android) {
          return false;
        }

        const granted = await PermissionsAndroid.request(
          options.android.detail === "fine"
            ? PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            : PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          options.android.rationale || undefined
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      // Unsupported
      default:
        return false;
    }
  }

  public async getCurrentPermission(): Promise<LocationPermissionStatus> {
    switch (Platform.OS) {
      // iOS permissions
      case "ios":
        return await this.nativeInterface.getAuthorizationStatus();
      // Android permissions
      case "android": {
        const fine = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        const coarse = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        );

        return fine || coarse ? "authorizedAlways" : "notDetermined";
      }
      // Unsupported
      default:
        // Platform not supported, so return "restricted" to signal that there's nothing
        return "restricted";
    }
  }

  public async checkPermission(
    options: RequestPermissionOptions
  ): Promise<boolean> {
    switch (Platform.OS) {
      // iOS Permissions
      case "ios": {
        const currentPermission = await this.nativeInterface.getAuthorizationStatus();
        if (options.ios === "always") {
          return currentPermission === "authorizedAlways";
        } else if (options.ios === "whenInUse") {
          return (
            currentPermission === "authorizedAlways" ||
            currentPermission === "authorizedWhenInUse"
          );
        }
        return false;
      }
      // Android permissions
      case "android": {
        if (!options.android) {
          return false;
        }

        const grantedFine = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        const grantedCoarse = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        if (options.android.detail === "fine") {
          return grantedFine;
        } else if (options.android.detail === "coarse") {
          return grantedFine || grantedCoarse;
        } else {
          return false;
        }
      }
      // Unsupported
      default:
        return false;
    }
  }

  public subscribeToPermissionUpdates(
    listener: (status: LocationPermissionStatus) => void
  ): Subscription {
    const emitterSubscription = this.eventEmitter.addListener(
      "authorizationStatusDidChange",
      listener
    );

    return () => {
      emitterSubscription.remove();
    };
  }
}
