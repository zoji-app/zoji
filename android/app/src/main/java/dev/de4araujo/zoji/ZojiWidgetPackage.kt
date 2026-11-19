package dev.de4araujo.zoji

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ZojiWidgetPackage : ReactPackage {
    override fun createNativeModules(
        context: ReactApplicationContext,
    ): List<NativeModule> = listOf(ZojiWidgetModule(context))

    override fun createViewManagers(
        context: ReactApplicationContext,
    ): List<ViewManager<*, *>> = emptyList()
}
