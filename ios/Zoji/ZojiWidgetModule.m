#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ZojiWidgetModule, NSObject)
RCT_EXTERN_METHOD(saveCredentials:(NSString *)refreshToken)
RCT_EXTERN_METHOD(updateStatus:(NSString *)jsonString)
RCT_EXTERN_METHOD(refreshWidget)
RCT_EXTERN_METHOD(clearStatus)
@end
