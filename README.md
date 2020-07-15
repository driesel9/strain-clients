# The Strain App

<img src="./resources/icon.png" width="64" height="64"/>




## iOS build and deploy

### Create iOS platform

```
cordova platform add ios
```

### Cocoapods setup

`onesignal-cordova-plugin` uses CocoaPods to manage dependencies. This can cause errors while generating the iOS platform, or errors during compilation. To solve the problem:

- Step 1: Prerequisites

    If CocoaPods is not installed in your mac, install it. 
   
    ```
    sudo gem install cocoapods
    ```

    If CocoaPods is outdated, update it.

    ```
    pod repo update
    ```
- Step 2: Install dependencies
    ```
    pod install --project-directory="./platforms/ios"
    ```

### Generate icon and splash

We can use `cordova-res` to generate icon and splash.
https://www.npmjs.com/package/cordova-res

### iOS build and deploy

After fixed `onesignal` plugin and prepared icon/splash, you need to update ios platform.

```
cordova prepare ios
```

Or fresh update

```
cordova plugin save
cordova platform remove ios
cordova platform add ios
```

And then, goto `platforms/ios` and open <PROJECT_NAME>.`xcworkspapce` file using XCode.

That's it. You can build and deploy with XCode. A good example for iOS deployment is [here](https://guide.freecodecamp.org/mobile-app-development/cordova-ios-application-development-setup-to-deployment/).
