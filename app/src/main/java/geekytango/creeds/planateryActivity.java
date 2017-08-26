package geekytango.creeds;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;

/**
 * Created by t@nG0 on 29-07-2017.
 */

public class planateryActivity extends Activity {
    WebView wv;

    protected void onCreate(@Nullable Bundle b){
        super.onCreate(b);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,WindowManager.LayoutParams.FLAG_FULLSCREEN);
        setContentView(R.layout.coil);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT);
        wv= (WebView)findViewById(R.id.wv1);
        wv.getSettings().setJavaScriptEnabled(true);
        wv.setHorizontalScrollBarEnabled(false);
        wv.setVerticalScrollBarEnabled(false);
        wv.loadUrl("file:///android_asset/PlanateryDefense/index.html");
    }
}
