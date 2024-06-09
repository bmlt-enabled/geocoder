# geocoder

Google Maps JS Geocoder

GOOGLE MAPS GEOCODER TOOL.

This is a very simple tool that is meant to be a "workshop" for address lookups, using the Google JavaScript Geocode API.

It has two boxes:

    Address Entry Form
        This form is on the left, and contains a bunch of text input fields.
        You enter the address into these fields, and the string below them shows how the address is being "built."
        When you submit the form, a Google Geocode is done, using the "built" address. You can also enter a long/lat pair,
        and do a reverse geocode.

    Geocode Response Display
        This is on the right side, and displays the result of the lookup. It displays them as simple <div> elements.
        Between the two forms is a column of links that allows you to copy data from the response to the corresponding
        text input in the Entry form.
        You will also have a link in the response form that allows you to go to Google Maps to observe the location there.
        If there are more than one places that correspond to the given data, they are displayed, one at a time, and links
        are provided to help you select which one is displayed.
