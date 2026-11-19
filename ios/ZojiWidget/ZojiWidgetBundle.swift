//
//  ZojiWidgetBundle.swift
//  ZojiWidget
//
//  Created by Mário Araújo on 27/06/26.
//

import WidgetKit
import SwiftUI

@main
struct ZojiWidgetBundle: WidgetBundle {
    private var pushWidget: (any Widget & _LimitedAvailabilityWidgetMarker)? {
        if #available(iOS 26.0, *) {
            return WidgetBundleBuilder.buildLimitedAvailability(ZojiStatusWidgetPush())
        }
        return nil
    }

    private var legacyWidget: (any Widget & _LimitedAvailabilityWidgetMarker)? {
        if #unavailable(iOS 26.0) {
            return WidgetBundleBuilder.buildLimitedAvailability(ZojiStatusWidget())
        }
        return nil
    }

    var body: some Widget {
        WidgetBundleBuilder.buildBlock(
            WidgetBundleBuilder.buildOptional(pushWidget),
            WidgetBundleBuilder.buildOptional(legacyWidget)
        )
    }
}
